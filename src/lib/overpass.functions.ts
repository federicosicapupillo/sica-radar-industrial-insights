import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const TIMEOUT_MS = 25_000;
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 min

type CacheEntry = { at: number; payload: OverpassResult };
const cache = new Map<string, CacheEntry>();

export type OsmCandidatePayload = {
  id: string;
  name: string | null;
  tags: Record<string, string>;
  areaSqm: number;
  lat: number;
  lon: number;
  geometry: Array<{ lat: number; lon: number }>;
  diffPct: number;
  compatibility: number;
};

export type OverpassAttempt = {
  host: string;
  ok: boolean;
  status: number | null;
  message: string;
  durationMs: number;
};

export type SearchMode = "light" | "extended";

export type OverpassResult = {
  ok: boolean;
  endpointUsed: string | null;
  responseTimeMs: number;
  rawCount: number;
  candidates: OsmCandidatePayload[];
  error: string | null;
  cached: boolean;
  attempts: OverpassAttempt[];
  mode: SearchMode;
};

function polygonAreaSqm(coords: Array<{ lat: number; lon: number }>): number {
  if (coords.length < 3) return 0;
  const R = 6378137;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat0 = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const cosLat0 = Math.cos(toRad(lat0));
  const pts = coords.map((c) => ({ x: toRad(c.lon) * R * cosLat0, y: toRad(c.lat) * R }));
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function centroid(coords: Array<{ lat: number; lon: number }>) {
  const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
  const lon = coords.reduce((s, c) => s + c.lon, 0) / coords.length;
  return { lat, lon };
}

const INDUSTRIAL_HINT_KEYS = ["industrial", "man_made", "landuse", "craft", "logistics"];
function hasIndustrialHint(tags: Record<string, string>): boolean {
  if (!tags) return false;
  for (const k of INDUSTRIAL_HINT_KEYS) if (tags[k]) return true;
  return false;
}

function buildQL(lat: number, lon: number, radiusKm: number, mode: SearchMode): string {
  const r = Math.max(50, Math.round(radiusKm * 1000));
  const light = `
  way["building"="industrial"](around:${r},${lat},${lon});
  way["building"="warehouse"](around:${r},${lat},${lon});
  way["building"="commercial"](around:${r},${lat},${lon});
  way["building"="retail"](around:${r},${lat},${lon});
  way["building"="manufacture"](around:${r},${lat},${lon});
  way["building"="yes"]["industrial"](around:${r},${lat},${lon});
  way["building"="yes"]["landuse"="industrial"](around:${r},${lat},${lon});`;
  const extended = `
  way["landuse"="industrial"](around:${r},${lat},${lon});
  way["industrial"](around:${r},${lat},${lon});`;
  return `[out:json][timeout:20];
(${light}${mode === "extended" ? extended : ""}
);
out tags geom;`;
}


async function fetchWithTimeout(url: string, body: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

export const searchOverpass = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        radiusKm: z.number().min(0.1).max(50),
        targetSqm: z.number().min(1).max(1_000_000),
        tolerancePct: z.number().min(0).max(100),
        mode: z.enum(["light", "extended"]).optional().default("light"),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<OverpassResult> => {
    const { lat, lon, radiusKm, targetSqm, tolerancePct, mode } = data;
    const key = `${lat.toFixed(5)}|${lon.toFixed(5)}|${radiusKm}|${targetSqm}|${tolerancePct}|${mode}`;
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return { ...cached.payload, cached: true };
    }

    const ql = buildQL(lat, lon, radiusKm, mode);
    const minSqm = Math.max(0, targetSqm * (1 - tolerancePct / 100));
    const maxSqm = targetSqm * (1 + tolerancePct / 100);

    let lastErr: string | null = null;
    const started = Date.now();
    const attempts: OverpassAttempt[] = [];

    for (const url of ENDPOINTS) {
      const host = new URL(url).host;
      const epStart = Date.now();
      try {
        const res = await fetchWithTimeout(url, ql);
        if (!res.ok) {
          const msg = `Overpass ${res.status} su ${host}`;
          lastErr = msg;
          attempts.push({ host, ok: false, status: res.status, message: msg, durationMs: Date.now() - epStart });
          continue;
        }
        const json: any = await res.json();
        const elems: any[] = Array.isArray(json?.elements) ? json.elements : [];
        const cands: OsmCandidatePayload[] = [];
        for (const el of elems) {
          const geom = Array.isArray(el.geometry) ? el.geometry : null;
          if (!geom || geom.length < 3) continue;
          const tags = el.tags ?? {};
          if (mode === "light" && tags.building === "yes" && !hasIndustrialHint(tags)) continue;
          const area = polygonAreaSqm(geom);
          if (area < minSqm || area > maxSqm) continue;
          const c = centroid(geom);
          const diffPct = ((area - targetSqm) / targetSqm) * 100;
          const score = Math.max(0, Math.round(100 - Math.min(100, Math.abs(diffPct) * 2)));
          cands.push({
            id: `${el.type}/${el.id}`,
            name: tags.name ?? null,
            tags,
            areaSqm: Math.round(area),
            lat: c.lat,
            lon: c.lon,
            geometry: geom,
            diffPct,
            compatibility: score,
          });
        }
        cands.sort((a, b) => b.compatibility - a.compatibility);
        attempts.push({ host, ok: true, status: 200, message: `${elems.length} elementi`, durationMs: Date.now() - epStart });
        const payload: OverpassResult = {
          ok: true,
          endpointUsed: host,
          responseTimeMs: Date.now() - started,
          rawCount: elems.length,
          candidates: cands.slice(0, 50),
          error: null,
          cached: false,
          attempts,
          mode,
        };
        cache.set(key, { at: now, payload });
        return payload;
      } catch (e: any) {
        const msg = e?.name === "AbortError" ? `timeout ${TIMEOUT_MS}ms su ${host}` : `${e?.message ?? "errore"} su ${host}`;
        lastErr = msg;
        attempts.push({ host, ok: false, status: null, message: msg, durationMs: Date.now() - epStart });
      }
    }

    return {
      ok: false,
      endpointUsed: null,
      responseTimeMs: Date.now() - started,
      rawCount: 0,
      candidates: [],
      error:
        attempts.length > 0
          ? `Overpass non disponibile (${mode === "extended" ? "modalità estesa" : "modalità leggera"}). Riduci raggio a 2 km${mode === "extended" ? " o passa a Ricerca leggera" : ""} o riprova tra qualche minuto.`
          : lastErr ?? "Ricerca OSM non completata.",
      cached: false,
      attempts,
      mode,
    };
  });
