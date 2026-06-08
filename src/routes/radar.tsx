import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Radar, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink, Search, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compatStatusFromScore, COMPAT_LABEL, COMPAT_CLS } from "@/lib/compatibility";
import { searchOverpass, type OsmCandidatePayload, type OverpassResult } from "@/lib/overpass.functions";

export const Route = createFileRoute("/radar")({
  component: RadarPage,
  head: () => ({
    meta: [
      { title: "Radar ricerca capannoni · Sica Industrial Radar" },
      { name: "description", content: "Ricerca capannoni industriali via OpenStreetMap/Overpass." },
    ],
  }),
});

type Mode = "demo" | "osm";

type OsmCandidate = OsmCandidatePayload;

// ----------------- Component -----------------

function RadarPage() {
  const [mode, setMode] = useState<Mode>("demo");

  return (
    <>
      <PageHeader
        title="Radar ricerca capannoni"
        subtitle="Modalità Demo o ricerca reale OpenStreetMap/Overpass."
        actions={
          <div className="inline-flex rounded-md border bg-card overflow-hidden text-xs">
            <button
              onClick={() => setMode("demo")}
              className={`px-3 py-1.5 ${mode === "demo" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              Demo
            </button>
            <button
              onClick={() => setMode("osm")}
              className={`px-3 py-1.5 border-l ${mode === "osm" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              Ricerca reale OSM
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6">
        {mode === "demo" ? <DemoView /> : <OsmView />}
      </div>
    </>
  );
}

// ----------------- Demo view (existing) -----------------

const DATA_SOURCE = {
  currentSource: "Inserimento manuale + Misuratore (KML/KMZ, GeoJSON)",
  isReal: false,
  apiConfigured: false,
  provider: "Overpass API / OpenStreetMap (disponibile nella scheda Ricerca reale OSM)",
  missing: [
    "Mapping tag OSM → categoria capannone già attivo (industrial/warehouse/commercial/landuse)",
    "Deduplica vs opportunità esistenti su lat/lon (da rifinire)",
    "Cache risultati Overpass lato server (oggi chiamata diretta dal browser)",
    "Filtri per provincia/comune (oggi solo raggio in km)",
  ],
} as const;

function DemoView() {
  return (
    <>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold text-foreground">Modalità dimostrativa</div>
          <p className="text-muted-foreground mt-1">
            Nessuna ricerca automatica. I dati arrivano da inserimento manuale e dal{" "}
            <Link to="/misuratore" className="text-primary hover:underline">Misuratore</Link>.
            Per cercare candidati reali passa a <b>Ricerca reale OSM</b>.
          </p>
        </div>
      </div>

      <section className="bg-card border rounded-lg overflow-hidden">
        <header className="px-5 py-4 border-b flex items-center gap-2">
          <Radar className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Stato fonte dati</h2>
        </header>
        <div className="divide-y">
          <Row label="Fonte attuale" value={DATA_SOURCE.currentSource} />
          <Row label="Dati reali" value={<span className="inline-flex items-center gap-1 text-amber-600"><XCircle className="w-4 h-4" /> No — flusso manuale</span>} />
          <Row label="API configurata" value={<span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Sì (Overpass pubblica)</span>} />
          <Row label="Provider" value={DATA_SOURCE.provider} />
        </div>
      </section>

      <section className="bg-card border rounded-lg overflow-hidden">
        <header className="px-5 py-4 border-b flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" /><h2 className="font-semibold">Limiti attuali</h2>
        </header>
        <ul className="px-5 py-4 space-y-2 text-sm">
          {DATA_SOURCE.missing.map((m) => (
            <li key={m} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{m}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

// ----------------- OSM view -----------------

type Zone = { label: string; lat: number; lon: number; radiusKm: number };
type Province = { name: string; zones: Zone[] };
type Region = { name: string; provinces: Province[] };

const ZONES: Region[] = [
  {
    name: "Toscana",
    provinces: [
      { name: "Massa-Carrara", zones: [
        { label: "Massa zona industriale", lat: 44.0350, lon: 10.1390, radiusKm: 4 },
        { label: "Massa / Carrara / Avenza", lat: 44.0440, lon: 10.0850, radiusKm: 4 },
        { label: "Carrara zona industriale / marmo", lat: 44.0800, lon: 10.1000, radiusKm: 4 },
      ]},
      { name: "Lucca", zones: [
        { label: "Pietrasanta / Versilia", lat: 43.9590, lon: 10.2280, radiusKm: 4 },
        { label: "Viareggio / Montramito / Massarosa", lat: 43.8800, lon: 10.2700, radiusKm: 4 },
      ]},
      { name: "Pisa", zones: [
        { label: "Pisa / Navicelli", lat: 43.6880, lon: 10.3910, radiusKm: 4 },
      ]},
    ],
  },
  {
    name: "Liguria",
    provinces: [
      { name: "La Spezia", zones: [
        { label: "La Spezia zona porto / industriale", lat: 44.1070, lon: 9.8280, radiusKm: 5 },
        { label: "Santo Stefano Magra", lat: 44.1510, lon: 9.9150, radiusKm: 4 },
        { label: "Sarzana", lat: 44.1110, lon: 9.9630, radiusKm: 4 },
        { label: "Arcola / Vezzano Ligure", lat: 44.1190, lon: 9.8950, radiusKm: 4 },
      ]},
      { name: "Genova", zones: [
        { label: "Genova / Bolzaneto", lat: 44.4560, lon: 8.9010, radiusKm: 5 },
      ]},
    ],
  },
  {
    name: "Emilia-Romagna",
    provinces: [
      { name: "Parma", zones: [{ label: "Parma zona industriale", lat: 44.8050, lon: 10.3280, radiusKm: 5 }] },
      { name: "Reggio Emilia", zones: [{ label: "Reggio Emilia zona industriale", lat: 44.6980, lon: 10.6310, radiusKm: 5 }] },
      { name: "Modena", zones: [{ label: "Modena zona industriale", lat: 44.6470, lon: 10.9250, radiusKm: 5 }] },
      { name: "Bologna", zones: [{ label: "Bologna / Interporto", lat: 44.6200, lon: 11.4100, radiusKm: 5 }] },
    ],
  },
  {
    name: "Lombardia",
    provinces: [
      { name: "Milano", zones: [
        { label: "Milano hinterland industriale", lat: 45.4642, lon: 9.1900, radiusKm: 5 },
        { label: "Rho / Pero", lat: 45.5320, lon: 9.0400, radiusKm: 5 },
      ]},
      { name: "Monza e Brianza", zones: [{ label: "Monza / Brianza", lat: 45.5840, lon: 9.2740, radiusKm: 5 }] },
      { name: "Bergamo", zones: [{ label: "Bergamo zona industriale", lat: 45.6980, lon: 9.6770, radiusKm: 5 }] },
      { name: "Brescia", zones: [{ label: "Brescia zona industriale", lat: 45.5410, lon: 10.2110, radiusKm: 5 }] },
    ],
  },
  {
    name: "Piemonte",
    provinces: [
      { name: "Torino", zones: [
        { label: "Torino zona industriale", lat: 45.0700, lon: 7.6860, radiusKm: 5 },
        { label: "Orbassano / Rivalta", lat: 45.0050, lon: 7.5380, radiusKm: 5 },
      ]},
      { name: "Novara", zones: [{ label: "Novara zona industriale", lat: 45.4460, lon: 8.6220, radiusKm: 5 }] },
      { name: "Alessandria", zones: [{ label: "Alessandria zona industriale", lat: 44.9130, lon: 8.6150, radiusKm: 5 }] },
    ],
  },
  {
    name: "Veneto",
    provinces: [
      { name: "Verona", zones: [{ label: "Verona zona industriale", lat: 45.4380, lon: 10.9910, radiusKm: 5 }] },
      { name: "Padova", zones: [{ label: "Padova zona industriale", lat: 45.4060, lon: 11.8760, radiusKm: 5 }] },
      { name: "Vicenza", zones: [{ label: "Vicenza zona industriale", lat: 45.5450, lon: 11.5350, radiusKm: 5 }] },
      { name: "Venezia", zones: [{ label: "Venezia / Marghera", lat: 45.4660, lon: 12.2560, radiusKm: 5 }] },
    ],
  },
  { name: "Friuli-Venezia Giulia", provinces: [] },
  { name: "Trentino-Alto Adige", provinces: [] },
  { name: "Valle d'Aosta", provinces: [] },
];

function OsmView() {
  const navigate = useNavigate();
  const [selRegion, setSelRegion] = useState<string>("");
  const [selProvince, setSelProvince] = useState<string>("");
  const [selZone, setSelZone] = useState<string>("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [radiusKm, setRadiusKm] = useState("2");
  const [searchMode, setSearchMode] = useState<"light" | "extended">("light");

  const [targetSqm, setTargetSqm] = useState("4000");
  const [tolerancePct, setTolerancePct] = useState("30");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OsmCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [meta, setMeta] = useState<Omit<OverpassResult, "candidates"> | null>(null);
  type MatchInfo = {
    opportunityId: string;
    title: string;
    savedSqm: number | null;
    distanceM: number;
    exact: boolean;
  };
  const [matchMap, setMatchMap] = useState<Record<string, MatchInfo>>({});
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, { open: boolean; text: string }>>({});
  type ChkStatus = "todo" | "ok" | "na" | "nr";
  type PropVerifyDraft = {
    visibleCompany: string;
    possibleOccupant: string;
    possibleOwner: string;
    phone: string;
    email: string;
    source: string;
    notes: string;
    status: "" | "da_identificare" | "occupante" | "proprieta" | "contatto" | "non_verificabile";
  };
  const emptyPropVerify: PropVerifyDraft = {
    visibleCompany: "", possibleOccupant: "", possibleOwner: "",
    phone: "", email: "", source: "", notes: "", status: "",
  };
  const [checklists, setChecklists] = useState<Record<string, Record<string, ChkStatus>>>({});
  const [checklistOpen, setChecklistOpen] = useState<Record<string, boolean>>({});
  const [propVerifyMap, setPropVerifyMap] = useState<Record<string, PropVerifyDraft>>({});
  const [propVerifyOpen, setPropVerifyOpen] = useState<string | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const [discardedMap, setDiscardedMap] = useState<Record<string, string>>({}); // candidate.id -> discarded row id
  const [filter, setFilter] = useState<"all" | "highQuality" | "highInterest" | "verifyOwner" | "saved" | "discarded" | "unsaved">("all");
  const [lastSearches, setLastSearches] = useState<any[]>([]);
  const [confirmDup, setConfirmDup] = useState<{ c: OsmCandidate; match: MatchInfo } | null>(null);
  type OccupantDraft = {
    company: string;
    sign: string;
    phone: string;
    email: string;
    website: string;
    source: string;
    confidence: string;
    notes: string;
    open: boolean;
  };
  const emptyDraft: OccupantDraft = {
    company: "", sign: "", phone: "", email: "", website: "",
    source: "", confidence: "", notes: "", open: false,
  };
  const [occupantDrafts, setOccupantDrafts] = useState<Record<string, OccupantDraft>>({});
  const getDraft = (id: string) => occupantDrafts[id] ?? emptyDraft;
  const patchDraft = (id: string, p: Partial<OccupantDraft>) =>
    setOccupantDrafts((m) => ({ ...m, [id]: { ...(m[id] ?? emptyDraft), ...p } }));
  const runOverpass = useServerFn(searchOverpass);

  const target = Number(targetSqm) || 0;
  const tol = Number(tolerancePct) || 0;
  const minSqm = Math.max(0, Math.round(target * (1 - tol / 100)));
  const maxSqm = Math.round(target * (1 + tol / 100));

  const refreshLastSearches = useCallback(async () => {
    const { data } = await supabase
      .from("radar_searches" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setLastSearches(data as any[]);
  }, []);

  useEffect(() => { refreshLastSearches(); }, [refreshLastSearches]);

  function haversineM(aLat: number, aLon: number, bLat: number, bLon: number) {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLon = toRad(bLon - aLon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function buildingTypeLabel(c: OsmCandidate): string {
    const t = c.tags ?? {};
    if (t.building && t.building !== "yes") return `building=${t.building}`;
    if (t.landuse) return `landuse=${t.landuse}`;
    if (t.industrial) return `industrial=${t.industrial}`;
    if (t.man_made) return `man_made=${t.man_made}`;
    if (t.craft) return `craft=${t.craft}`;
    if (t.building === "yes") return "edificio generico";
    return "edificio";
  }

  function addressLabel(c: OsmCandidate): string | null {
    const t = c.tags ?? {};
    const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
    const city = t["addr:city"] ?? t["addr:town"] ?? t["addr:village"] ?? null;
    const parts = [street || null, city].filter(Boolean) as string[];
    return parts.length ? parts.join(", ") : null;
  }

  type Quality = { level: "alta" | "media" | "bassa"; reason: string };
  function dataQuality(c: OsmCandidate): Quality {
    const t = c.tags ?? {};
    const hasGeom = (c.geometry?.length ?? 0) >= 3;
    const industrialSpecific =
      (t.building && ["industrial", "warehouse", "manufacture", "commercial", "retail"].includes(t.building)) ||
      !!t.industrial ||
      t.landuse === "industrial";
    if (c.name && industrialSpecific && hasGeom)
      return { level: "alta", reason: "Nome, tag industriale specifico e geometria presenti." };
    if (hasGeom && industrialSpecific)
      return { level: "media", reason: "Tag compatibile e geometria, manca il nome." };
    if (hasGeom && t.building && t.building !== "yes")
      return { level: "media", reason: "Geometria e tag edificio specifico." };
    return { level: "bassa", reason: "Edificio generico (building=yes) o tag poco specifici." };
  }

  type Interest = { level: "alto" | "medio" | "basso"; reason: string };
  function commercialInterest(c: OsmCandidate, q: Quality): Interest {
    const t = c.tags ?? {};
    const industrialSpecific =
      (t.building && ["industrial", "warehouse", "manufacture"].includes(t.building)) ||
      !!t.industrial ||
      t.landuse === "industrial";
    const areaLarge = c.areaSqm >= 3000;
    if (industrialSpecific && areaLarge && q.level !== "bassa")
      return { level: "alto", reason: "Edificio industriale con tag specifico e superficie ampia." };
    if (industrialSpecific || (q.level !== "bassa" && areaLarge))
      return { level: "medio", reason: "Edificio compatibile ma dati da completare in loco." };
    return { level: "basso", reason: "Edificio generico senza chiari segnali industriali." };
  }

  const CHK_ITEMS: Array<[string, string]> = [
    ["industrial", "Realmente industriale/logistico/artigianale"],
    ["bilici", "Accesso bilici"],
    ["piazzale", "Piazzale esterno"],
    ["altezza", "Altezza interna stimata"],
    ["portoni", "Portoni carrabili"],
    ["insegna", "Insegna o azienda occupante"],
    ["stato", "Attivo / libero / dismesso / sottoutilizzato"],
    ["annunci", "Annunci online collegati"],
    ["proprieta", "Possibile proprietà"],
    ["contatti", "Contatti disponibili"],
  ];
  const CHK_STATUS_LABEL: Record<ChkStatus, string> = {
    todo: "Da fare",
    ok: "Verificato",
    na: "Non disponibile",
    nr: "Non rilevante",
  };
  const CHK_STATUS_CLS: Record<ChkStatus, string> = {
    todo: "bg-card text-foreground border-border",
    ok: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    na: "bg-muted text-muted-foreground border-border",
    nr: "bg-muted text-muted-foreground border-border opacity-70",
  };

  function nextStep(c: OsmCandidate, q: Quality, i: Interest): string {
    if (q.level === "bassa")
      return "Dato troppo generico: verifica su Google Maps/Earth prima di salvare.";
    if (!c.name && !addressLabel(c))
      return "Apri Google Maps e verifica insegne, accessi e indirizzo.";
    if (i.level === "alto")
      return "Cerca eventuale azienda occupante online e salva come opportunità da lavorare.";
    if (q.level === "media")
      return "Misura superficie indicativa su Maps/Earth e completa manualmente prima di salvare.";
    return "Salva come opportunità e completa manualmente le verifiche sul campo.";
  }

  function checklistSummary(id: string): string {
    const cl = checklists[id];
    if (!cl) return "";
    const lines: string[] = [];
    for (const [k, label] of CHK_ITEMS) {
      const s = cl[k];
      if (s && s !== "todo") lines.push(`• ${label}: ${CHK_STATUS_LABEL[s]}`);
  }

  function resultHash(c: OsmCandidate): string {
    return `${c.id}|${c.lat.toFixed(5)}|${c.lon.toFixed(5)}|${Math.round(c.areaSqm)}`;
  }

  async function refreshDiscarded(candidates: OsmCandidate[]) {
    if (candidates.length === 0) { setDiscardedMap({}); return; }
    const hashes = candidates.map(resultHash);
    const { data } = await supabase
      .from("radar_discarded_results" as any)
      .select("id, result_hash, restored_at")
      .in("result_hash", hashes);
    const dMap: Record<string, string> = {};
    const dismissedNext: Record<string, boolean> = {};
    (data ?? []).forEach((r: any) => {
      const cand = candidates.find((c) => resultHash(c) === r.result_hash);
      if (!cand) return;
      dMap[cand.id] = r.id;
      if (!r.restored_at) dismissedNext[cand.id] = true;
    });
    setDiscardedMap(dMap);
    setDismissed(dismissedNext);
  }

  async function discardCandidate(c: OsmCandidate) {
    setDismissed((m) => ({ ...m, [c.id]: true }));
    try {
      const quality = dataQuality(c);
      const interest = commercialInterest(c, quality);
      const existingId = discardedMap[c.id];
      if (existingId) {
        await supabase.from("radar_discarded_results" as any)
          .update({ restored_at: null, discarded_at: new Date().toISOString() })
          .eq("id", existingId);
      } else {
        const { data } = await supabase.from("radar_discarded_results" as any).insert({
          osm_id: c.id.split("/")[1] ?? c.id,
          osm_type: c.id.split("/")[0] ?? null,
          result_hash: resultHash(c),
          title: c.name ?? null,
          address: addressLabel(c),
          lat: c.lat,
          lng: c.lon,
          building_type: buildingTypeLabel(c),
          data_quality: quality.level,
          commercial_interest: interest.level,
          discard_reason: noteDrafts[c.id]?.text?.trim() || null,
        }).select("id").single();
        if (data) setDiscardedMap((m) => ({ ...m, [c.id]: (data as any).id }));
      }
    } catch (e: any) {
      // non bloccare UI
      console.warn("discard persist failed", e?.message);
    }
  }

  async function restoreCandidate(c: OsmCandidate) {
    setDismissed((m) => { const n = { ...m }; delete n[c.id]; return n; });
    const existingId = discardedMap[c.id];
    if (!existingId) return;
    try {
      await supabase.from("radar_discarded_results" as any)
        .update({ restored_at: new Date().toISOString() })
        .eq("id", existingId);
    } catch { /* ignore */ }
  }






  async function refreshExisting(candidates: OsmCandidate[], centerLat: number, centerLon: number, radiusKm: number) {
    if (candidates.length === 0) {
      setMatchMap({});
      return;
    }
    const urls = candidates.map((c) => `https://www.openstreetmap.org/${c.id}`);
    const { data: exactRows } = await supabase
      .from("opportunities")
      .select("id, title, source_url, latitude, longitude, covered_sqm")
      .eq("source_type", "OpenStreetMap/Overpass")
      .in("source_url", urls);
    const exactByOsm: Record<string, any> = {};
    (exactRows ?? []).forEach((row: any) => {
      const m = /openstreetmap\.org\/(.+)$/.exec(row.source_url ?? "");
      if (m) exactByOsm[m[1]] = row;
    });

    const bufKm = radiusKm + 0.2;
    const dLat = bufKm / 111;
    const dLon = bufKm / (111 * Math.cos((centerLat * Math.PI) / 180) || 1);
    const { data: nearbyRows } = await supabase
      .from("opportunities")
      .select("id, title, latitude, longitude, covered_sqm")
      .eq("source_type", "OpenStreetMap/Overpass")
      .gte("latitude", centerLat - dLat)
      .lte("latitude", centerLat + dLat)
      .gte("longitude", centerLon - dLon)
      .lte("longitude", centerLon + dLon);
    const nearby = (nearbyRows ?? []).filter(
      (r: any) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude),
    );

    const map: Record<string, MatchInfo> = {};
    for (const c of candidates) {
      const ex = exactByOsm[c.id];
      if (ex) {
        const dist = Number.isFinite(ex.latitude) && Number.isFinite(ex.longitude)
          ? haversineM(c.lat, c.lon, ex.latitude, ex.longitude)
          : 0;
        map[c.id] = {
          opportunityId: ex.id,
          title: ex.title ?? "Opportunità",
          savedSqm: ex.covered_sqm != null ? Number(ex.covered_sqm) : null,
          distanceM: Math.round(dist),
          exact: true,
        };
        continue;
      }
      let best: MatchInfo | null = null;
      for (const r of nearby) {
        const dist = haversineM(c.lat, c.lon, Number(r.latitude), Number(r.longitude));
        if (dist > 30) continue;
        const savedArea = r.covered_sqm != null ? Number(r.covered_sqm) : null;
        const areaOk =
          savedArea != null && savedArea > 0 &&
          Math.abs(savedArea - c.areaSqm) / Math.max(savedArea, c.areaSqm) <= 0.05;
        if (!areaOk) continue;
        if (!best || dist < best.distanceM) {
          best = {
            opportunityId: r.id,
            title: r.title ?? "Opportunità",
            savedSqm: savedArea,
            distanceM: Math.round(dist),
            exact: false,
          };
        }
      }
      if (best) map[c.id] = best;
    }
    setMatchMap(map);
  }

  const lastRunRef = useRef<{ key: string; at: number } | null>(null);
  async function runSearch() {
    if (loading) return;
    setError(null);
    setResults(null);
    setMeta(null);
    setMatchMap({});
    const la = Number(lat), lo = Number(lon), rk = Number(radiusKm);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || !Number.isFinite(rk) || rk <= 0) {
      setError("Inserisci lat/lon validi e raggio > 0");
      return;
    }
    if (target <= 0) {
      setError("Inserisci mq target > 0");
      return;
    }
    const key = `${la.toFixed(5)}|${lo.toFixed(5)}|${rk}|${target}|${tol}`;
    const now = Date.now();
    if (lastRunRef.current && lastRunRef.current.key === key && now - lastRunRef.current.at < 10_000) {
      const left = Math.ceil((10_000 - (now - lastRunRef.current.at)) / 1000);
      setError(`Stessa ricerca già lanciata. Riprova tra ${left}s o cambia parametri.`);
      return;
    }
    lastRunRef.current = { key, at: now };
    setSearchCenter({ lat: la, lon: lo });
    setLoading(true);
    let res: OverpassResult | null = null;
    let runtimeError: string | null = null;
    try {
      res = await runOverpass({
        data: { lat: la, lon: lo, radiusKm: rk, targetSqm: target, tolerancePct: tol, mode: searchMode },
      });
      const { candidates, ...rest } = res;
      setMeta(rest);
      if (!res.ok) {
        setError(res.error ?? "Ricerca OSM non completata. Overpass non disponibile o troppo lento. Riprova riducendo raggio o cambiando zona.");
        setResults([]);
      } else {
        setResults(candidates);
        await refreshExisting(candidates, la, lo, rk);
        if (candidates.length === 0) toast.info("Nessun candidato OSM nel range mq.");
        else toast.success(`${candidates.length} candidati trovati`);
      }
    } catch (e: any) {
      runtimeError = e?.message ?? "Errore Overpass";
      setError(runtimeError);
    } finally {
      setLoading(false);
    }
    // Log search to history
    try {
      await supabase.from("radar_searches" as any).insert({
        latitude: la,
        longitude: lo,
        radius_km: rk,
        target_covered_sqm: target,
        tolerance_percent: tol,
        min_covered_sqm: minSqm,
        max_covered_sqm: maxSqm,
        source_type: "OpenStreetMap/Overpass",
        endpoint_used: res?.endpointUsed ?? null,
        response_time_ms: res?.responseTimeMs ?? null,
        raw_results_count: res?.rawCount ?? 0,
        compatible_results_count: res?.candidates.length ?? 0,
        search_status: res?.ok ? "ok" : "error",
        error_message: runtimeError ?? res?.error ?? null,
      });
      refreshLastSearches();
    } catch { /* non bloccare UI */ }
  }

  function repeatSearch(s: any) {
    setLat(String(s.latitude ?? ""));
    setLon(String(s.longitude ?? ""));
    setRadiusKm(String(s.radius_km ?? ""));
    setTargetSqm(String(s.target_covered_sqm ?? ""));
    setTolerancePct(String(s.tolerance_percent ?? ""));
    toast.info("Parametri caricati. Clicca Avvia ricerca per rilanciare.");
  }

  async function saveCandidate(c: OsmCandidate, force = false) {
    const match = matchMap[c.id];
    if (match && !force) {
      setConfirmDup({ c, match });
      return;
    }
    const d = getDraft(c.id);
    setSavingId(c.id);
    try {
      const status = compatStatusFromScore(c.compatibility);
      const priority = c.compatibility >= 80 ? "alta" : c.compatibility >= 50 ? "media" : "bassa";
      const tagSummary = c.tags.building
        ? `building=${c.tags.building}`
        : c.tags.landuse
          ? `landuse=${c.tags.landuse}`
          : "industrial";
      const title = c.name ?? `Candidato OSM ${tagSummary} (${c.areaSqm.toLocaleString("it-IT")} mq)`;
      const geojson = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[...c.geometry.map((p) => [p.lon, p.lat]), [c.geometry[0].lon, c.geometry[0].lat]]],
        },
        properties: { osm_id: c.id, tags: c.tags, source: "OpenStreetMap/Overpass" },
      };
      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          title,
          city: "Da verificare",
          province: "Da verificare",
          opportunity_status: "da_verificare",
          priority,
          latitude: c.lat,
          longitude: c.lon,
          covered_sqm: c.areaSqm,
          measured_covered_sqm: c.areaSqm,
          target_covered_sqm: target,
          compatibility_score: c.compatibility,
          compatibility_status: status,
          geojson_data: geojson as any,
          geometry_data: geojson as any,
          measurement_source: "osm_overpass",
          measurement_confidence: "media",
          source_type: "OpenStreetMap/Overpass",
          source_url: `https://www.openstreetmap.org/${c.id}`,
          google_maps_url: `https://www.google.com/maps?q=${c.lat},${c.lon}`,
          google_earth_url: `https://earth.google.com/web/@${c.lat},${c.lon},150a,500d,35y,0h,0t,0r`,
          suggested_next_action: (() => {
            const q = dataQuality(c);
            const i = commercialInterest(c, q);
            const pv = propVerifyMap[c.id];
            const base = nextStep(c, q, i);
            const owner = pv && pv.status && pv.status !== "non_verificabile"
              ? `Verifica proprietà: ${pv.status}.`
              : pv?.status === "non_verificabile"
                ? "Proprietà non verificabile in autonomia: valutare visura/catasto."
                : "Verificare proprietà, occupante, altezza e accesso bilici.";
            return `${base} ${owner}`.trim();
          })(),
          last_measured_at: new Date().toISOString(),
          // Occupant draft (optional) - merged con possibile occupante della verifica proprietà
          occupant_company_name: d.company.trim() || propVerifyMap[c.id]?.possibleOccupant.trim() || propVerifyMap[c.id]?.visibleCompany.trim() || null,
          occupant_sign_name: d.sign.trim() || propVerifyMap[c.id]?.visibleCompany.trim() || null,
          occupant_phone: d.phone.trim() || propVerifyMap[c.id]?.phone.trim() || null,
          occupant_email: d.email.trim() || propVerifyMap[c.id]?.email.trim() || null,
          occupant_website: d.website.trim() || null,
          occupant_contact_source: d.source.trim() || propVerifyMap[c.id]?.source.trim() || null,
          occupant_contact_confidence: d.confidence.trim() || null,
          occupant_contact_notes: [
            d.notes.trim(),
            noteDrafts[c.id]?.text?.trim(),
            propVerifyMap[c.id]?.notes?.trim(),
            propVerifyMap[c.id]?.possibleOwner?.trim() ? `Possibile proprietà: ${propVerifyMap[c.id]!.possibleOwner.trim()}` : "",
          ].filter(Boolean).join("\n") || null,
          occupant_contact_status: (d.company.trim() || d.phone.trim() || propVerifyMap[c.id]?.phone.trim()) ? "da_chiamare" : null,
          commercial_notes: (() => {
            const q = dataQuality(c);
            const i = commercialInterest(c, q);
            const pv = propVerifyMap[c.id];
            const blocks: string[] = [];
            const userNote = [d.notes.trim(), noteDrafts[c.id]?.text?.trim()].filter(Boolean).join("\n");
            if (userNote) blocks.push(userNote);
            blocks.push(`Fonte: OpenStreetMap/Overpass • Qualità dato: ${q.level} • Potenziale commerciale: ${i.level}`);
            blocks.push(`Prossimo passo: ${nextStep(c, q, i)}`);
            const chk = checklistSummary(c.id);
            if (chk) blocks.push(`Checklist verifica:\n${chk}`);
            if (pv && (pv.status || pv.visibleCompany || pv.possibleOccupant || pv.possibleOwner || pv.phone || pv.email || pv.source || pv.notes)) {
              const parts = [
                pv.status ? `stato=${pv.status}` : "",
                pv.visibleCompany ? `insegna=${pv.visibleCompany}` : "",
                pv.possibleOccupant ? `occupante=${pv.possibleOccupant}` : "",
                pv.possibleOwner ? `proprietà=${pv.possibleOwner}` : "",
                pv.phone ? `tel=${pv.phone}` : "",
                pv.email ? `email=${pv.email}` : "",
                pv.source ? `fonte=${pv.source}` : "",
              ].filter(Boolean).join(" · ");
              blocks.push(`Verifica proprietà: ${parts}${pv.notes ? `\nNote: ${pv.notes}` : ""}`);
            }
            return blocks.join("\n\n");
          })(),
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Candidato salvato come opportunità");
      setSavedMap((m) => ({ ...m, [c.id]: data.id }));
    } catch (e: any) {
      toast.error(e?.message ?? "Errore salvataggio");
    } finally {
      setSavingId(null);
      setConfirmDup(null);
    }
  }

  function openExisting(opportunityId: string) {
    navigate({ to: "/opportunita/$id", params: { id: opportunityId } });
  }

  async function copyCoords(la: number, lo: number) {
    try {
      await navigator.clipboard.writeText(`${la}, ${lo}`);
      toast.success("Coordinate copiate");
    } catch { toast.error("Impossibile copiare"); }
  }


  return (
    <>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
        <Radar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold text-foreground">Ricerca reale OpenStreetMap / Overpass</div>
          <p className="text-muted-foreground mt-1">
            I risultati sono <b>candidati tecnici da verificare</b>. Nessuno scraping, nessuna info su proprietario o
            telefono, mai dichiarati “già in vendita”.
          </p>
        </div>
      </div>

      {/* Form */}
      <section className="bg-card border rounded-lg p-5 space-y-4">
        {(() => {
          const region = ZONES.find((r) => r.name === selRegion);
          const province = region?.provinces.find((p) => p.name === selProvince);
          const filter = zoneFilter.trim().toLowerCase();
          const zoneList = (province?.zones ?? []).filter((z) =>
            !filter || z.label.toLowerCase().includes(filter) || (province?.name ?? "").toLowerCase().includes(filter)
          );
          const zone = province?.zones.find((z) => z.label === selZone);
          const canSearch = !!zone || (Number(lat) && Number(lon) && Number(radiusKm) > 0);
          return (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Regione</label>
                  <select
                    value={selRegion}
                    onChange={(e) => { setSelRegion(e.target.value); setSelProvince(""); setSelZone(""); }}
                    className="w-full mt-1 h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="">— Seleziona regione —</option>
                    {ZONES.map((r) => (
                      <option key={r.name} value={r.name} disabled={r.provinces.length === 0}>
                        {r.name}{r.provinces.length === 0 ? " (presto)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Provincia</label>
                  <select
                    value={selProvince}
                    onChange={(e) => { setSelProvince(e.target.value); setSelZone(""); }}
                    disabled={!region || region.provinces.length === 0}
                    className="w-full mt-1 h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
                  >
                    <option value="">— Seleziona provincia —</option>
                    {region?.provinces.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Città / zona industriale</label>
                  <select
                    value={selZone}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelZone(v);
                      const z = province?.zones.find((zz) => zz.label === v);
                      if (z) {
                        setLat(String(z.lat));
                        setLon(String(z.lon));
                        setRadiusKm(String(z.radiusKm));
                      }
                    }}
                    disabled={!province}
                    className="w-full mt-1 h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
                  >
                    <option value="">— Seleziona zona —</option>
                    {zoneList.map((z) => (
                      <option key={z.label} value={z.label}>{z.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                type="text"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                placeholder="Cerca città o zona…"
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="Mq target" value={targetSqm} onChange={setTargetSqm} placeholder="4000" type="number" />
                <Field label="Tolleranza %" value={tolerancePct} onChange={setTolerancePct} placeholder="30" type="number" />
                <Field label="Raggio (km)" value={radiusKm} onChange={setRadiusKm} placeholder="2" type="number" />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Modalità ricerca OSM</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchMode("light")}
                    className={`text-xs px-3 py-1.5 rounded-md border ${searchMode === "light" ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}
                  >
                    Ricerca leggera edificio (consigliata)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("extended")}
                    className={`text-xs px-3 py-1.5 rounded-md border ${searchMode === "extended" ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}
                  >
                    Ricerca estesa industriale
                  </button>
                </div>
                {searchMode === "extended" && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Ricerca più pesante: può richiedere più tempo o fallire su Overpass.
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Range mq calcolato: <b>{minSqm.toLocaleString("it-IT")}</b> – <b>{maxSqm.toLocaleString("it-IT")}</b> mq
              </div>
              {Number(radiusKm) > 5 && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Raggio ampio: la ricerca potrebbe fallire. Prova 2-3 km per risultati più stabili.
                </div>
              )}
              {zone && (
                <div className="text-xs bg-muted/30 border rounded-md px-3 py-2">
                  Zona selezionata: <b>{zone.label}</b> — coordinate usate: <b>{zone.lat.toFixed(4)}, {zone.lon.toFixed(4)}</b> — raggio consigliato <b>{zone.radiusKm} km</b>
                </div>
              )}
              <details open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)} className="border rounded-md">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground select-none">
                  Coordinate avanzate (opzionale)
                </summary>
                <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Latitudine" value={lat} onChange={setLat} placeholder="44.0350" />
                  <Field label="Longitudine" value={lon} onChange={setLon} placeholder="10.1390" />
                  <Field label="Raggio (km)" value={radiusKm} onChange={setRadiusKm} placeholder="2" type="number" />
                </div>
              </details>
              <div className="text-xs text-muted-foreground bg-muted/30 border rounded-md px-3 py-2">
                Per risultati più stabili usa <b>raggio 2-3 km</b> e modalità <b>leggera</b>. Per capannoni da 4.000 mq prova <b>tolleranza 30-40%</b>.
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={runSearch}
                  disabled={loading || !canSearch}
                  title={!canSearch ? "Seleziona una zona o inserisci coordinate avanzate" : ""}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? "Ricerca in corso..." : "Avvia ricerca reale OSM"}
                </button>
                {lat && lon && (
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-md border bg-card hover:bg-accent"
                  >
                    Apri centro su Maps <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {error && (
                <div className="space-y-2 border border-destructive/40 bg-destructive/5 rounded-md p-3">
                  <div className="text-sm text-destructive">{error}</div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={runSearch} disabled={loading} className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent disabled:opacity-60">Riprova</button>
                    <button onClick={() => { setRadiusKm("2"); setError(null); }} className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent">Riduci raggio a 2 km</button>
                    {searchMode === "extended" && (
                      <button onClick={() => { setSearchMode("light"); setError(null); }} className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent">Passa a ricerca leggera</button>
                    )}
                    {lat && lon && (
                      <a href={`https://www.google.com/maps?q=${lat},${lon}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent inline-flex items-center gap-1">
                        Apri centro su Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button onClick={() => navigate({ to: "/misuratore" })} className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent">Usa Misuratore manuale</button>
                  </div>
                </div>
              )}
            </>
          );
        })()}

      </section>

      {meta && (
        <section className="bg-card border rounded-lg p-4 text-xs space-y-1">
          <div className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Stato fonte dati
          </div>
          <div><span className="text-muted-foreground">Modalità:</span> OSM reale server-side — <b>{meta.mode === "extended" ? "Ricerca estesa industriale" : "Ricerca leggera edificio"}</b></div>
          <div><span className="text-muted-foreground">Endpoint usato:</span> {meta.endpointUsed ?? "—"}</div>
          <div><span className="text-muted-foreground">Tempo risposta:</span> {meta.responseTimeMs} ms{meta.cached ? " (da cache)" : ""}</div>
          <div><span className="text-muted-foreground">Risultati grezzi:</span> {meta.rawCount}</div>
          <div><span className="text-muted-foreground">Risultati compatibili:</span> {results?.length ?? 0}</div>
          {meta.attempts && meta.attempts.length > 0 && (
            <div className="pt-1">
              <div className="text-muted-foreground mb-0.5">Endpoint tentati:</div>
              <ul className="space-y-0.5">
                {meta.attempts.map((a, i) => (
                  <li key={i} className={a.ok ? "text-emerald-700" : "text-destructive"}>
                    {a.ok ? "✓" : "✗"} {a.host} {a.status != null ? `(${a.status})` : ""} — {a.message} · {a.durationMs}ms
                  </li>
                ))}
              </ul>
            </div>
          )}
          {meta.error && <div className="text-destructive"><span className="text-muted-foreground">Errore finale:</span> {meta.error}</div>}
          {!meta.ok && (
            <div className="pt-1 text-muted-foreground">
              Consiglio: riduci raggio a 2 km{meta.mode === "extended" ? ", passa a Ricerca leggera edificio" : ""} o riprova tra qualche minuto.
            </div>
          )}
          <div className="pt-2 mt-1 border-t space-y-1 text-muted-foreground">
            <div><b className="text-foreground">Modalità leggera:</b> consigliata per prime ricerche rapide su singola zona.</div>
            <div><b className="text-foreground">Modalità estesa:</b> utile per aree industriali ampie, ma può essere più lenta o restituire dati incompleti.</div>
            <div><b className="text-foreground">Fonte OSM/Overpass:</b> dati collaborativi da verificare manualmente prima di contatti, offerte o valutazioni commerciali.</div>
          </div>

        </section>
      )}

      {/* Results */}
      {results && results.length === 0 && meta?.ok && (
        <section className="bg-card border rounded-lg p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">Nessun immobile rilevato automaticamente</div>
              <p className="text-muted-foreground mt-1">
                Nessun immobile industriale rilevato automaticamente in questa zona con i parametri attuali.
                Questo non significa che non esistano capannoni: i dati mappa OSM possono essere incompleti.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setRadiusKm(String(Math.min(10, (Number(radiusKm) || 2) + 2))); }}
              className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent"
            >
              Allarga raggio (+2 km)
            </button>
            {searchMode === "light" && (
              <button
                onClick={() => setSearchMode("extended")}
                className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent"
              >
                Passa a modalità estesa
              </button>
            )}
            {searchCenter && (
              <a
                href={`https://www.google.com/maps?q=${searchCenter.lat},${searchCenter.lon}`}
                target="_blank" rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent inline-flex items-center gap-1"
              >
                Apri zona su Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => navigate({ to: "/opportunita/nuova" })}
              className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent"
            >
              Inserisci immobile manualmente
            </button>
            <button
              onClick={() => navigate({ to: "/misuratore" })}
              className="text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent"
            >
              Usa misuratore superficie
            </button>
          </div>
        </section>
      )}

      {results && results.length > 0 && (
        <section className="space-y-3">
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{results.length} candidati nel range mq • fonte OpenStreetMap/Overpass</span>
            {Object.values(dismissed).filter(Boolean).length > 0 && (
              <button
                onClick={() => setDismissed({})}
                className="text-xs underline text-primary"
              >
                Ripristina tutti gli scartati ({Object.values(dismissed).filter(Boolean).length})
              </button>
            )}
          </div>
          {results.map((c) => {
            const status = compatStatusFromScore(c.compatibility);
            const match = matchMap[c.id];
            const isDismissed = !!dismissed[c.id];
            const savedOppId = savedMap[c.id] ?? (match?.exact ? match.opportunityId : null);
            const cardState: "saved" | "match" | "dismissed" | "new" =
              savedMap[c.id]
                ? "saved"
                : match?.exact
                  ? "match"
                  : isDismissed
                    ? "dismissed"
                    : "new";
            const stateBadge =
              cardState === "saved"
                ? { label: "Salvato come opportunità", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" }
                : cardState === "match"
                  ? { label: "Già presente in archivio", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" }
                  : cardState === "dismissed"
                    ? { label: "Scartato", cls: "bg-muted text-muted-foreground border-border" }
                    : { label: "Non salvato", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30" };
            const quality = dataQuality(c);
            const interest = commercialInterest(c, quality);
            const distM = searchCenter ? Math.round(haversineM(searchCenter.lat, searchCenter.lon, c.lat, c.lon)) : null;
            const addr = addressLabel(c);
            const qualityCls = quality.level === "alta"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
              : quality.level === "media"
                ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                : "bg-muted text-muted-foreground border-border";
            const interestCls = interest.level === "alto"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
              : interest.level === "medio"
                ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                : "bg-muted text-muted-foreground border-border";
            const note = noteDrafts[c.id] ?? { open: false, text: "" };
            const chk = checklists[c.id] ?? {};
            const chkOpen = !!checklistOpen[c.id];
            const chkInsufficient = !c.name && !addr && quality.level === "bassa";
            const nextStepText = nextStep(c, quality, interest);
            const pv = propVerifyMap[c.id];
            const pvStatusLabel: Record<string, string> = {
              da_identificare: "Da identificare",
              occupante: "Occupante trovato",
              proprieta: "Proprietà trovata",
              contatto: "Contatto trovato",
              non_verificabile: "Non verificabile",
            };
            return (
              <article
                key={c.id}
                className={`bg-card border rounded-lg p-4 space-y-3 ${isDismissed ? "opacity-60" : ""} ${cardState === "saved" || cardState === "match" ? "border-emerald-500/40" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${stateBadge.cls}`}>
                        {stateBadge.label}
                      </span>
                      <span className="truncate">
                        {c.name ?? <span className="text-muted-foreground italic">Senza nome</span>}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                      <span className="font-medium text-foreground/80">{buildingTypeLabel(c)}</span>
                      {addr && <span>· {addr}</span>}
                      {distM != null && <span>· {distM < 1000 ? `${distM} m` : `${(distM / 1000).toFixed(2)} km`} dal centro</span>}
                      <span>· OSM {c.id}</span>
                      <span>· lat {c.lat.toFixed(5)}, lon {c.lon.toFixed(5)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${COMPAT_CLS[status]}`}>
                      {c.compatibility}% · {COMPAT_LABEL[status]}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${qualityCls}`} title={quality.reason}>
                      Dato {quality.level}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-blue-500/10 text-blue-700 border-blue-500/30">
                      OpenStreetMap
                    </span>
                    {match && !match.exact && cardState !== "saved" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-orange-500/10 text-orange-700 border-orange-500/30">
                        Possibile duplicato
                      </span>
                    )}
                  </div>
                </div>

                <div className={`rounded-md border px-3 py-2 text-xs ${interestCls}`}>
                  <div className="font-semibold">
                    Potenziale interesse commerciale: {interest.level.toUpperCase()}
                  </div>
                  <div className="opacity-80 mt-0.5">{interest.reason}</div>
                </div>

                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                  <div className="font-semibold text-primary">Prossimo passo consigliato</div>
                  <div className="mt-0.5 text-foreground/90">{nextStepText}</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Superficie stimata" value={`${c.areaSqm.toLocaleString("it-IT")} mq`} />
                  <Stat label="Differenza target" value={`${c.diffPct >= 0 ? "+" : ""}${c.diffPct.toFixed(0)}%`} />
                  <Stat label="Qualità dato" value={quality.level} />
                  <Stat label="Fonte" value="OSM / Overpass" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://www.google.com/maps?q=${c.lat},${c.lon}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
                  >
                    Apri in Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://earth.google.com/web/@${c.lat},${c.lon},150a,500d,35y,0h,0t,0r`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
                  >
                    Misura su Maps/Earth <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/${c.id}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
                  >
                    OSM <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyCoords(c.lat, c.lon)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
                  >
                    Copia coordinate
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteDrafts((m) => ({ ...m, [c.id]: { ...(m[c.id] ?? { text: "" }), open: !note.open } }))}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border ${note.text ? "bg-primary/10 border-primary/40 text-primary" : "bg-card hover:bg-accent"}`}
                  >
                    {note.text ? "Nota aggiunta" : "Aggiungi nota"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPropVerifyOpen(c.id)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border ${pv?.status ? "bg-amber-500/15 border-amber-500/40 text-amber-700" : "bg-card hover:bg-accent"}`}
                  >
                    {pv?.status ? `✓ ${pvStatusLabel[pv.status] ?? "Verifica proprietà"}` : "Verifica proprietà / occupante"}
                  </button>
                  {isDismissed ? (
                    <button
                      type="button"
                      onClick={() => setDismissed((m) => { const n = { ...m }; delete n[c.id]; return n; })}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
                    >
                      Ripristina
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDismissed((m) => ({ ...m, [c.id]: true }))}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent text-muted-foreground"
                    >
                      Scarta
                    </button>
                  )}
                </div>

                {note.open && (
                  <div className="border rounded-md bg-muted/20 p-3">
                    <label className="block">
                      <span className="block text-xs font-medium text-muted-foreground mb-1">Nota commerciale</span>
                      <textarea
                        value={note.text}
                        onChange={(e) => setNoteDrafts((m) => ({ ...m, [c.id]: { open: true, text: e.target.value } }))}
                        rows={2}
                        className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="Es. da controllare insegna, sembra in uso, accesso bilici…"
                      />
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      La nota verrà salvata insieme all'opportunità.
                    </p>
                  </div>
                )}

                {/* Checklist verifica commerciale */}
                <div className="border rounded-md bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setChecklistOpen((m) => ({ ...m, [c.id]: !m[c.id] }))}
                    className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium hover:bg-accent/40"
                  >
                    <span>
                      Checklist verifica commerciale
                      {(() => {
                        const done = CHK_ITEMS.filter(([k]) => chk[k] && chk[k] !== "todo").length;
                        return done > 0 ? <span className="ml-2 text-primary">· {done}/{CHK_ITEMS.length}</span> : null;
                      })()}
                    </span>
                    <span className="text-muted-foreground">{chkOpen ? "−" : "+"}</span>
                  </button>
                  {chkOpen && (
                    <div className="p-3 border-t space-y-2">
                      {chkInsufficient && (
                        <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-2 py-1.5">
                          Dati mappa insufficienti. Usa Google Maps/Earth o inserimento manuale per completare la verifica.
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {CHK_ITEMS.map(([k, label]) => {
                          const cur = (chk[k] ?? "todo") as ChkStatus;
                          return (
                            <div key={k} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="flex-1 min-w-[180px]">{label}</span>
                              <div className="inline-flex rounded-md border overflow-hidden">
                                {(["todo", "ok", "na", "nr"] as ChkStatus[]).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setChecklists((m) => ({ ...m, [c.id]: { ...(m[c.id] ?? {}), [k]: s } }))}
                                    className={`px-2 py-0.5 text-[11px] border-l first:border-l-0 ${cur === s ? CHK_STATUS_CLS[s] + " font-semibold" : "hover:bg-accent"}`}
                                  >
                                    {CHK_STATUS_LABEL[s]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        La checklist verrà inclusa nelle note commerciali al salvataggio.
                      </p>
                    </div>
                  )}
                </div>

                {/* Occupant draft panel */}
                {cardState !== "match" && (() => {
                  const d = getDraft(c.id);
                  return (
                    <div className="border rounded-md bg-muted/20">
                      <button
                        type="button"
                        onClick={() => patchDraft(c.id, { open: !d.open })}
                        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium hover:bg-accent/40"
                      >
                        <span>
                          Azienda occupante / primo contatto
                          {(d.company || d.phone) && (
                            <span className="ml-2 text-primary">
                              · {d.company || d.phone}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground">{d.open ? "−" : "+"}</span>
                      </button>
                      {d.open && (
                        <div className="p-3 border-t space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Field label="Nome azienda occupante" value={d.company} onChange={(v) => patchDraft(c.id, { company: v })} placeholder="Es. Rossi Logistics srl" />
                            <Field label="Insegna visibile" value={d.sign} onChange={(v) => patchDraft(c.id, { sign: v })} placeholder="Insegna sul capannone" />
                            <Field label="Telefono" value={d.phone} onChange={(v) => patchDraft(c.id, { phone: v })} placeholder="+39 ..." />
                            <Field label="Email" value={d.email} onChange={(v) => patchDraft(c.id, { email: v })} placeholder="info@..." />
                            <Field label="Sito web" value={d.website} onChange={(v) => patchDraft(c.id, { website: v })} placeholder="https://..." />
                            <Field label="Fonte contatto" value={d.source} onChange={(v) => patchDraft(c.id, { source: v })} placeholder="Es. insegna, Google, passaggio" />
                            <Field label="Attendibilità contatto" value={d.confidence} onChange={(v) => patchDraft(c.id, { confidence: v })} placeholder="alta / media / bassa" />
                          </div>
                          <label className="block">
                            <span className="block text-xs font-medium text-muted-foreground mb-1">Note occupante</span>
                            <textarea
                              value={d.notes}
                              onChange={(e) => patchDraft(c.id, { notes: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                              placeholder="Es. cancello con logo X, camion bilici visti"
                            />
                          </label>
                          <p className="text-[11px] text-muted-foreground">
                            Solo dati osservati o dichiarati. Non confondere occupante con proprietario.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex flex-wrap gap-2 pt-1">
                  {savedOppId ? (
                    <>
                      <button
                        onClick={() => openExisting(savedOppId)}
                        className="ml-auto inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Apri scheda opportunità
                      </button>
                      <button
                        onClick={() => setNoteDrafts((m) => ({ ...m, [c.id]: { ...(m[c.id] ?? { text: "" }), open: true } }))}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-card hover:bg-accent"
                      >
                        Aggiorna nota
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => saveCandidate(c)}
                      disabled={savingId === c.id || isDismissed}
                      className="ml-auto inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Salva come opportunità
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Property verify modal */}
      {propVerifyOpen && (() => {
        const id = propVerifyOpen;
        const c = results?.find((r) => r.id === id);
        const pv = propVerifyMap[id] ?? emptyPropVerify;
        const setPv = (p: Partial<PropVerifyDraft>) =>
          setPropVerifyMap((m) => ({ ...m, [id]: { ...(m[id] ?? emptyPropVerify), ...p } }));
        const addr = c ? addressLabel(c) : null;
        const searchQuery = c ? encodeURIComponent(`${c.name ?? ""} ${addr ?? ""} ${c.lat.toFixed(5)},${c.lon.toFixed(5)}`.trim()) : "";
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setPropVerifyOpen(null)}>
            <div className="bg-card border rounded-lg p-5 max-w-2xl w-full my-8 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-base">Verifica proprietà / occupante</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supporto manuale al lavoro commerciale. Nessuno scraping automatico.
                  </p>
                </div>
                <button onClick={() => setPropVerifyOpen(null)} className="text-xs text-muted-foreground hover:text-foreground">Chiudi</button>
              </div>

              {c && (
                <div className="flex flex-wrap gap-2">
                  <a href={`https://www.google.com/maps?q=${c.lat},${c.lon}`} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent inline-flex items-center gap-1">
                    Apri in Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                  <a href={`https://www.google.com/search?q=${searchQuery}`} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent inline-flex items-center gap-1">
                    Cerca su Google <ExternalLink className="w-3 h-3" />
                  </a>
                  <a href={`https://www.google.com/maps?q=&layer=c&cbll=${c.lat},${c.lon}`} target="_blank" rel="noreferrer" className="text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent inline-flex items-center gap-1">
                    Apri Street View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div>
                <label className="block">
                  <span className="block text-xs font-medium text-muted-foreground mb-1">Stato verifica proprietà</span>
                  <select
                    value={pv.status}
                    onChange={(e) => setPv({ status: e.target.value as PropVerifyDraft["status"] })}
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="">— Seleziona —</option>
                    <option value="da_identificare">Da identificare</option>
                    <option value="occupante">Occupante trovato</option>
                    <option value="proprieta">Proprietà trovata</option>
                    <option value="contatto">Contatto trovato</option>
                    <option value="non_verificabile">Non verificabile</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nome azienda visibile" value={pv.visibleCompany} onChange={(v) => setPv({ visibleCompany: v })} placeholder="Insegna / nome esposto" />
                <Field label="Possibile occupante" value={pv.possibleOccupant} onChange={(v) => setPv({ possibleOccupant: v })} placeholder="Azienda che utilizza l'immobile" />
                <Field label="Possibile proprietà" value={pv.possibleOwner} onChange={(v) => setPv({ possibleOwner: v })} placeholder="Da verificare con visura/catasto" />
                <Field label="Telefono trovato" value={pv.phone} onChange={(v) => setPv({ phone: v })} placeholder="+39 ..." />
                <Field label="Email trovata" value={pv.email} onChange={(v) => setPv({ email: v })} placeholder="info@..." />
                <Field label="Fonte del dato" value={pv.source} onChange={(v) => setPv({ source: v })} placeholder="Es. Google, sito azienda, passaggio" />
              </div>

              <label className="block">
                <span className="block text-xs font-medium text-muted-foreground mb-1">Note verifica</span>
                <textarea
                  value={pv.notes}
                  onChange={(e) => setPv({ notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Cosa hai osservato? Quali fonti hai consultato? Cosa resta da verificare?"
                />
              </label>

              <p className="text-[11px] text-muted-foreground">
                Solo dati osservati o trovati manualmente. Non confondere occupante con proprietario. Verificare sempre con visura/catasto prima del contatto.
              </p>

              <div className="flex flex-wrap gap-2 justify-end pt-1">
                <button onClick={() => setPropVerifyOpen(null)} className="px-3 py-1.5 text-xs rounded-md border hover:bg-accent">Annulla</button>
                <button
                  onClick={() => { toast.success("Verifica salvata nella card. Sarà inclusa nelle note al salvataggio."); setPropVerifyOpen(null); }}
                  className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Salva note nella scheda
                </button>
              </div>
            </div>
          </div>
        );
      })()}



      {/* Storico ricerche */}
      {lastSearches.length > 0 && (
        <section className="bg-card border rounded-lg overflow-hidden">
          <header className="px-5 py-3 border-b flex items-center gap-2">
            <Radar className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Ultime ricerche Radar</h2>
          </header>
          <div className="divide-y text-sm">
            {lastSearches.map((s) => (
              <div key={s.id} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="text-xs text-muted-foreground w-32 shrink-0">
                  {new Date(s.created_at).toLocaleString("it-IT")}
                </div>
                <div className="text-xs"><b>{Number(s.target_covered_sqm ?? 0).toLocaleString("it-IT")}</b> mq · {s.radius_km} km</div>
                <div className="text-xs text-muted-foreground">{Number(s.latitude ?? 0).toFixed(4)}, {Number(s.longitude ?? 0).toFixed(4)}</div>
                <div className="text-xs">
                  {s.search_status === "ok"
                    ? <span className="text-emerald-700">{s.compatible_results_count ?? 0} compatibili</span>
                    : <span className="text-destructive">errore</span>}
                </div>
                <button
                  onClick={() => repeatSearch(s)}
                  className="ml-auto inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border bg-card hover:bg-accent"
                >
                  Ripeti ricerca
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Duplicate modal */}
      {confirmDup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDup(null)}>
          <div className="bg-card border rounded-lg p-5 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-base">
              {confirmDup.match.exact ? "Duplicato esatto" : "Possibile duplicato trovato"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {confirmDup.match.exact
                ? <>Edificio già presente nel CRM (stesso OSM id <code className="text-xs">{confirmDup.c.id}</code>).</>
                : "Edificio molto simile già presente nel CRM (stessa fonte OSM, coordinate e mq vicini)."}
            </p>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
              <div><span className="text-muted-foreground">Opportunità esistente:</span> <b>{confirmDup.match.title}</b></div>
              <div>
                <span className="text-muted-foreground">Mq salvati:</span>{" "}
                {confirmDup.match.savedSqm != null ? `${confirmDup.match.savedSqm.toLocaleString("it-IT")} mq` : "—"}
                <span className="text-muted-foreground"> · candidato:</span> {confirmDup.c.areaSqm.toLocaleString("it-IT")} mq
              </div>
              <div><span className="text-muted-foreground">Distanza stimata:</span> ~{confirmDup.match.distanceM} m</div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => setConfirmDup(null)}
                className="px-3 py-1.5 text-xs rounded-md border hover:bg-accent"
              >
                Annulla
              </button>
              <button
                onClick={() => openExisting(confirmDup.match.opportunityId)}
                className="px-3 py-1.5 text-xs rounded-md border bg-card hover:bg-accent inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Apri opportunità esistente
              </button>
              <button
                onClick={() => saveCandidate(confirmDup.c, true)}
                disabled={savingId === confirmDup.c.id}
                className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Salva comunque
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-md px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-1 md:gap-4 px-5 py-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
