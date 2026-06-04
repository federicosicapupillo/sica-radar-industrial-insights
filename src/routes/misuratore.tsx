import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import {
  Ruler,
  Save,
  Copy,
  Upload,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  MapPin,
  PencilRuler,
  ClipboardList,
  Trash2,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/misuratore")({
  component: MisuratorePage,
});

const MEASUREMENT_SOURCES = [
  { value: "google_earth_manual", label: "Google Earth (manuale)" },
  { value: "google_maps_manual", label: "Google Maps (manuale)" },
  { value: "rilievo_posto", label: "Rilievo sul posto" },
  { value: "planimetria", label: "Planimetria" },
  { value: "catasto", label: "Catasto / documento" },
  { value: "file_geo", label: "File geospaziale" },
  { value: "altro", label: "Altro" },
] as const;

const CONFIDENCE = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "bassa", label: "Bassa" },
  { value: "da_verificare", label: "Da verificare" },
] as const;

const TRISTATE = [
  { value: "non_verificato", label: "Da verificare" },
  { value: "si", label: "Sì" },
  { value: "no", label: "No" },
] as const;

const POLY_CATEGORIES = [
  { value: "none", label: "Non assegnato" },
  { value: "edificio", label: "Edificio coperto" },
  { value: "piazzale", label: "Piazzale" },
  { value: "area_totale", label: "Area totale" },
  { value: "altro", label: "Altro / da verificare" },
] as const;

const POLY_CAT_LABEL: Record<string, string> = Object.fromEntries(POLY_CATEGORIES.map((c) => [c.value, c.label]));

type PolyCategory = "none" | "edificio" | "piazzale" | "area_totale" | "altro";

type ParsedPolygon = {
  id: string;
  name: string;
  geometryType: "Polygon" | "Point" | "LineString" | "Other";
  areaSqm: number;
  geometry: unknown | null;
  assigned: PolyCategory;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

type Targets = {
  search_name: string;
  client_name: string;
  city: string;
  province: string;
  industrial_area: string;
  covered_min: string;
  covered_max: string;
  yard_min: string;
  height_min: string;
  truck_access: boolean;
  near_highway: boolean;
  near_port: boolean;
  intended_use: string;
  notes: string;
};

type Measured = {
  covered: string;
  yard: string;
  length: string;
  width: string;
  internal_height: string;
  estimated_height: string;
  truck_access_status: "si" | "no" | "non_verificato";
  offices_status: "si" | "no" | "non_verificato";
  source: string;
  confidence: string;
  notes: string;
};

type GeoState = {
  google_maps_url: string;
  google_earth_url: string;
  address: string;
  latitude: string;
  longitude: string;
  visual_notes: string;
  fileName: string;
  polygons: ParsedPolygon[];
};

const initialTargets: Targets = {
  search_name: "", client_name: "",
  city: "", province: "", industrial_area: "",
  covered_min: "", covered_max: "", yard_min: "", height_min: "",
  truck_access: false, near_highway: false, near_port: false,
  intended_use: "", notes: "",
};
const initialMeasured: Measured = {
  covered: "", yard: "", length: "", width: "",
  internal_height: "", estimated_height: "",
  truck_access_status: "non_verificato", offices_status: "non_verificato",
  source: "google_earth_manual", confidence: "media", notes: "",
};
const initialGeo: GeoState = {
  google_maps_url: "", google_earth_url: "",
  address: "", latitude: "", longitude: "",
  visual_notes: "",
  fileName: "",
  polygons: [],
};

function numOrNull(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type Compat = {
  status: "compatibile" | "parziale" | "non_compatibile" | "da_verificare";
  score: number;
  diffCovered: number | null;
  diffYard: number | null;
  missing: string[];
  warnings: string[];
  suggested: string;
};

function computeCompatibility(t: Targets, m: Measured): Compat {
  const missing: string[] = [];
  const warnings: string[] = [];
  const cMin = numOrNull(t.covered_min);
  const cMax = numOrNull(t.covered_max);
  const yMin = numOrNull(t.yard_min);
  const hMin = numOrNull(t.height_min);
  const mc = numOrNull(m.covered);
  const my = numOrNull(m.yard);
  const mh = numOrNull(m.internal_height) ?? numOrNull(m.estimated_height);

  if (mc == null) missing.push("Mq coperti misurati");
  if (my == null && yMin != null) missing.push("Mq piazzale misurati");
  if (hMin != null && mh == null) warnings.push("Altezza interna da verificare");
  if (t.truck_access && m.truck_access_status !== "si") warnings.push("Accesso bilici da verificare");

  let ok = 0;
  let total = 0;
  if (cMin != null) { total++; if (mc != null && mc >= cMin) ok++; }
  if (cMax != null && mc != null) { total++; if (mc <= cMax) ok++; }
  if (yMin != null) { total++; if (my != null && my >= yMin) ok++; }
  if (hMin != null) { total++; if (mh != null && mh >= hMin) ok++; }
  if (t.truck_access) { total++; if (m.truck_access_status === "si") ok++; }

  const diffCovered = cMin != null && mc != null ? mc - cMin : null;
  const diffYard = yMin != null && my != null ? my - yMin : null;
  const score = total === 0 ? 0 : Math.round((ok / total) * 100);

  let status: Compat["status"];
  if (mc == null || (yMin != null && my == null) || total === 0) status = "da_verificare";
  else if (score >= 90 && missing.length === 0) status = "compatibile";
  else if (score >= 60) status = "parziale";
  else status = "non_compatibile";

  let suggested = "Approfondire la verifica con sopralluogo o documenti";
  if (mh == null && hMin != null) suggested = "Verificare altezza interna del capannone";
  else if (status === "compatibile") suggested = "Identificare la proprietà e avviare contatto";
  else if (status === "parziale") suggested = "Verificare dati mancanti e richiedere conferma misure";
  else if (status === "non_compatibile") suggested = "Scartare perché fuori target oppure riproporre con requisiti diversi";

  return { status, score, diffCovered, diffYard, missing, warnings, suggested };
}

function statusBadge(s: Compat["status"]) {
  const map = {
    compatibile: { label: "Compatibile", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
    parziale: { label: "Parzialmente compatibile", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", Icon: AlertTriangle },
    non_compatibile: { label: "Non compatibile", cls: "bg-red-500/15 text-red-600 border-red-500/30", Icon: XCircle },
    da_verificare: { label: "Da verificare", cls: "bg-muted text-muted-foreground border-border", Icon: HelpCircle },
  } as const;
  const v = map[s];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${v.cls}`}>
      <v.Icon className="w-3.5 h-3.5" /> {v.label}
    </span>
  );
}

/* ---------- Geometria ---------- */

// Spherical polygon area in m² (ring of [lng,lat])
function polygonAreaM2(ring: [number, number][]): number {
  if (!ring || ring.length < 3) return 0;
  const R = 6378137;
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[(i + 1) % ring.length];
    area += ((lon2 - lon1) * Math.PI / 180) *
      (2 + Math.sin(lat1 * Math.PI / 180) + Math.sin(lat2 * Math.PI / 180));
  }
  return Math.abs(area * R * R / 2);
}

function parseKmlCoords(text: string): [number, number][] {
  return text.trim().split(/\s+/).map((tup) => {
    const parts = tup.split(",").map(Number);
    const lon = parts[0], lat = parts[1];
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return [lon, lat] as [number, number];
  }).filter((x): x is [number, number] => x !== null);
}

function parseKMLString(xml: string): ParsedPolygon[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("XML non valido");
  }
  const placemarks = Array.from(doc.getElementsByTagName("Placemark"));
  const result: ParsedPolygon[] = [];
  let pmIdx = 0;
  for (const pm of placemarks) {
    pmIdx++;
    const name = pm.getElementsByTagName("name")[0]?.textContent?.trim() || `Placemark ${pmIdx}`;
    const polygons = Array.from(pm.getElementsByTagName("Polygon"));
    if (polygons.length > 0) {
      polygons.forEach((poly, i) => {
        const outerText = poly.getElementsByTagName("outerBoundaryIs")[0]
          ?.getElementsByTagName("LinearRing")[0]
          ?.getElementsByTagName("coordinates")[0]?.textContent || "";
        const outer = parseKmlCoords(outerText);
        if (outer.length < 3) return;
        const inners = Array.from(poly.getElementsByTagName("innerBoundaryIs")).map((ib) => {
          const t = ib.getElementsByTagName("LinearRing")[0]
            ?.getElementsByTagName("coordinates")[0]?.textContent || "";
          return parseKmlCoords(t);
        }).filter((r) => r.length >= 3);
        const area = Math.max(0, polygonAreaM2(outer) - inners.reduce((a, r) => a + polygonAreaM2(r), 0));
        result.push({
          id: `kml-${pmIdx}-${i}-${result.length}`,
          name: polygons.length > 1 ? `${name} (poligono ${i + 1})` : name,
          geometryType: "Polygon",
          areaSqm: area,
          geometry: { type: "Polygon", coordinates: [outer, ...inners] },
          assigned: "none",
        });
      });
      continue;
    }
    if (pm.getElementsByTagName("Point").length > 0) {
      result.push({ id: `kml-p-${pmIdx}`, name, geometryType: "Point", areaSqm: 0, geometry: null, assigned: "none" });
    } else if (pm.getElementsByTagName("LineString").length > 0) {
      result.push({ id: `kml-l-${pmIdx}`, name, geometryType: "LineString", areaSqm: 0, geometry: null, assigned: "none" });
    } else {
      result.push({ id: `kml-o-${pmIdx}`, name, geometryType: "Other", areaSqm: 0, geometry: null, assigned: "none" });
    }
  }
  return result;
}

function parseGeoJSONToPolygons(json: unknown): ParsedPolygon[] {
  const out: ParsedPolygon[] = [];
  let idx = 0;
  type AnyGeom = { type: string; coordinates?: unknown; geometries?: AnyGeom[] };
  const push = (name: string, g: AnyGeom | null | undefined) => {
    if (!g || !g.type) return;
    if (g.type === "Polygon") {
      const ring = (g.coordinates as [number, number][][] | undefined)?.[0] || [];
      out.push({
        id: `gj-${idx++}`,
        name,
        geometryType: "Polygon",
        areaSqm: polygonAreaM2(ring),
        geometry: g,
        assigned: "none",
      });
    } else if (g.type === "MultiPolygon") {
      (g.coordinates as [number, number][][][]).forEach((poly, i) => {
        const ring = poly?.[0] || [];
        out.push({
          id: `gj-${idx++}-${i}`,
          name: `${name} (parte ${i + 1})`,
          geometryType: "Polygon",
          areaSqm: polygonAreaM2(ring),
          geometry: { type: "Polygon", coordinates: poly },
          assigned: "none",
        });
      });
    } else if (g.type === "GeometryCollection") {
      g.geometries?.forEach((sub) => push(name, sub));
    } else {
      out.push({ id: `gj-${idx++}`, name, geometryType: "Other", areaSqm: 0, geometry: g, assigned: "none" });
    }
  };
  const j = json as { type?: string; features?: Array<{ geometry: AnyGeom; properties?: { name?: string } }>; geometry?: AnyGeom };
  if (j?.type === "FeatureCollection" && Array.isArray(j.features)) {
    j.features.forEach((f, i) => push(f.properties?.name || `Feature ${i + 1}`, f.geometry));
  } else if (j?.type === "Feature" && j.geometry) {
    push("Feature", j.geometry);
  } else if (j?.type) {
    push("Geometry", j as AnyGeom);
  }
  return out;
}

function aggregatePolys(polys: ParsedPolygon[]) {
  const sumBy = (cat: PolyCategory) =>
    polys.filter((p) => p.assigned === cat).reduce((a, p) => a + p.areaSqm, 0);
  return {
    edificio: sumBy("edificio"),
    piazzale: sumBy("piazzale"),
    area_totale: sumBy("area_totale"),
  };
}

function buildFeatureCollection(polys: ParsedPolygon[], fileName: string) {
  const features = polys
    .filter((p) => p.geometry)
    .map((p) => ({
      type: "Feature" as const,
      properties: {
        name: p.name,
        assigned_category: p.assigned,
        area_sqm: Math.round(p.areaSqm),
        source_file: fileName || null,
      },
      geometry: p.geometry,
    }));
  return features.length > 0 ? { type: "FeatureCollection" as const, features } : null;
}

const STEPS = [
  { n: 1, label: "Parametri ricerca", Icon: ClipboardList },
  { n: 2, label: "Strumenti esterni", Icon: MapPin },
  { n: 3, label: "Misurazione", Icon: PencilRuler },
  { n: 4, label: "Esito e salvataggio", Icon: CheckCircle2 },
] as const;

function MisuratorePage() {
  const [step, setStep] = useState(1);
  const [t, setT] = useState<Targets>(initialTargets);
  const [m, setM] = useState<Measured>(initialMeasured);
  const [g, setG] = useState<GeoState>(initialGeo);
  const [tab, setTab] = useState<"manuale" | "file" | "coordinate">("manuale");
  const [parsing, setParsing] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const polyAgg = useMemo(() => aggregatePolys(g.polygons), [g.polygons]);

  // Misure effettive: il valore manuale ha priorità; in mancanza si usano gli assegnamenti del file
  const mEffective: Measured = useMemo(
    () => ({
      ...m,
      covered: m.covered || (polyAgg.edificio > 0 ? String(Math.round(polyAgg.edificio)) : ""),
      yard: m.yard || (polyAgg.piazzale > 0 ? String(Math.round(polyAgg.piazzale)) : ""),
    }),
    [m, polyAgg],
  );

  const compat = useMemo(() => computeCompatibility(t, mEffective), [t, mEffective]);

  const mapsHref = g.google_maps_url
    || (g.latitude && g.longitude ? `https://www.google.com/maps?q=${g.latitude},${g.longitude}` : null)
    || (g.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.address)}` : null);
  const earthWebHref = g.google_earth_url
    || (g.latitude && g.longitude ? `https://earth.google.com/web/@${g.latitude},${g.longitude},150a,1000d,35y,0h,0t,0r` : "https://earth.google.com/web/");
  const earthProHref = "https://www.google.com/earth/about/versions/#download-pro";

  const copyAddress = async () => {
    const v = g.address || (g.latitude && g.longitude ? `${g.latitude}, ${g.longitude}` : "");
    if (!v) return toast.error("Nessun indirizzo o coordinate da copiare");
    try { await navigator.clipboard.writeText(v); toast.success("Copiato"); }
    catch { toast.error("Impossibile copiare"); }
  };

  const pasteInto = async (key: "google_maps_url" | "google_earth_url") => {
    try {
      const v = await navigator.clipboard.readText();
      if (!v) return toast.error("Appunti vuoti");
      setG((p) => ({ ...p, [key]: v }));
      toast.success("Link incollato");
    } catch { toast.error("Impossibile leggere dagli appunti"); }
  };

  const setPolygons = (polys: ParsedPolygon[], fileName: string) => {
    setG((p) => ({ ...p, polygons: polys, fileName }));
    const polyCount = polys.filter((p) => p.geometryType === "Polygon").length;
    if (polyCount === 0 && polys.length > 0) {
      toast.message("Il file contiene elementi geografici, ma nessun poligono misurabile.");
    } else if (polyCount === 0) {
      toast.message("Nessuna geometria trovata nel file.");
    } else {
      toast.success(`File analizzato correttamente. Poligoni trovati: ${polyCount}`);
    }
  };

  const onFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File troppo grande (max 10 MB)");
      return;
    }
    if (file.size === 0) {
      toast.error("Il file è vuoto");
      return;
    }
    const ext = file.name.toLowerCase().split(".").pop() || "";
    setParsing(true);
    try {
      if (ext === "geojson" || ext === "json") {
        const text = await file.text();
        let json: unknown;
        try { json = JSON.parse(text); } catch { throw new Error("GeoJSON non valido"); }
        const polys = parseGeoJSONToPolygons(json);
        setPolygons(polys, file.name);
      } else if (ext === "kml") {
        const text = await file.text();
        let polys: ParsedPolygon[];
        try { polys = parseKMLString(text); }
        catch { throw new Error("File non leggibile. Verifica che sia un KML esportato correttamente."); }
        setPolygons(polys, file.name);
      } else if (ext === "kmz") {
        try {
          const JSZip = (await import("jszip")).default;
          const zip = await JSZip.loadAsync(await file.arrayBuffer());
          const entry = Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith(".kml"));
          if (!entry) {
            toast.message("KMZ caricato ma non analizzabile automaticamente in questa versione. Esporta da Google Earth in formato KML e ricarica il file.");
            setG((p) => ({ ...p, fileName: file.name, polygons: [] }));
            return;
          }
          const xml = await entry.async("text");
          const polys = parseKMLString(xml);
          setPolygons(polys, file.name);
        } catch {
          toast.message("KMZ caricato ma non analizzabile automaticamente in questa versione. Esporta da Google Earth in formato KML e ricarica il file.");
          setG((p) => ({ ...p, fileName: file.name, polygons: [] }));
        }
      } else {
        toast.error("Formato non supportato (usa .geojson, .kml, .kmz)");
      }
    } catch (e) {
      toast.error((e as Error).message || "Errore durante l'analisi del file");
    } finally {
      setParsing(false);
    }
  };

  const updatePolygon = (id: string, patch: Partial<ParsedPolygon>) => {
    setG((p) => ({ ...p, polygons: p.polygons.map((poly) => (poly.id === id ? { ...poly, ...patch } : poly)) }));
  };
  const removePolygon = (id: string) => {
    setG((p) => ({ ...p, polygons: p.polygons.filter((poly) => poly.id !== id) }));
  };
  const clearFile = () => setG((p) => ({ ...p, polygons: [], fileName: "" }));

  const geoArea = polyAgg.area_totale > 0 ? Math.round(polyAgg.area_totale) : null;
  const featureCollection = buildFeatureCollection(g.polygons, g.fileName);

  const buildOpportunityPayload = () => {
    const titleBase =
      t.search_name || t.client_name || t.city || t.industrial_area || g.address || "Capannone misurato";
    const measuredCovered = numOrNull(mEffective.covered);
    const measuredYard = numOrNull(mEffective.yard);
    return {
      title: `${titleBase}${measuredCovered ? ` — ${measuredCovered} mq coperti` : ""}`,
      property_type: "capannone_industriale",
      opportunity_status: compat.status === "non_compatibile" ? "non_adatto" : "da_verificare",
      priority:
        compat.status === "compatibile" ? "alta" :
        compat.status === "parziale" ? "media" :
        compat.status === "non_compatibile" ? "bassa" : "media",
      province: t.province || null,
      city: t.city || null,
      address: g.address || null,
      latitude: numOrNull(g.latitude),
      longitude: numOrNull(g.longitude),
      covered_sqm: measuredCovered,
      yard_sqm: measuredYard,
      internal_height: numOrNull(m.internal_height),
      truck_access:
        m.truck_access_status === "si" ? true :
        m.truck_access_status === "no" ? false : null,
      has_offices:
        m.offices_status === "si" ? true :
        m.offices_status === "no" ? false : null,
      intended_use: t.intended_use || null,
      near_highway: t.near_highway || null,
      near_port: t.near_port || null,
      google_maps_url: g.google_maps_url || null,
      google_earth_url: g.google_earth_url || null,
      source_type: "manuale",
      search_name: t.search_name || null,
      client_name: t.client_name || null,
      industrial_area: t.industrial_area || null,
      target_covered_sqm: numOrNull(t.covered_min),
      target_covered_sqm_max: numOrNull(t.covered_max),
      target_yard_sqm: numOrNull(t.yard_min),
      target_internal_height: numOrNull(t.height_min),
      target_truck_access: t.truck_access,
      target_near_highway: t.near_highway,
      target_near_port: t.near_port,
      target_intended_use: t.intended_use || null,
      target_zone: t.industrial_area || null,
      target_notes: t.notes || null,
      measured_covered_sqm: measuredCovered,
      measured_yard_sqm: measuredYard,
      measured_length: numOrNull(m.length),
      measured_width: numOrNull(m.width),
      estimated_height: numOrNull(m.estimated_height),
      truck_access_status: m.truck_access_status,
      offices_status: m.offices_status,
      measurement_source: m.source,
      measurement_confidence: m.confidence,
      measurement_notes: m.notes || null,
      visual_notes: g.visual_notes || null,
      uploaded_file_url: g.fileName || null,
      geo_feature_type: g.polygons.length > 0 ? "file_kml_geojson" : null,
      geo_area_sqm: geoArea,
      geometry_data: featureCollection,
      geojson_data: featureCollection,
      compatibility_status: compat.status,
      compatibility_score: compat.score,
      missing_data: { missing: compat.missing, warnings: compat.warnings },
      suggested_next_action: compat.suggested,
      last_measured_at: new Date().toISOString(),
    } as Record<string, unknown>;
  };

  const buildDraftPayload = () => ({
    search_name: t.search_name || null,
    client_name: t.client_name || null,
    city: t.city || null,
    province: t.province || null,
    industrial_area: t.industrial_area || null,
    target_covered_sqm: numOrNull(t.covered_min),
    target_yard_sqm: numOrNull(t.yard_min),
    target_height: numOrNull(t.height_min),
    required_truck_access: t.truck_access,
    near_port_required: t.near_port,
    near_highway_required: t.near_highway,
    measured_covered_sqm: numOrNull(mEffective.covered),
    measured_yard_sqm: numOrNull(mEffective.yard),
    measured_length: numOrNull(m.length),
    measured_width: numOrNull(m.width),
    estimated_height: numOrNull(m.estimated_height) ?? numOrNull(m.internal_height),
    truck_access_status: m.truck_access_status,
    offices_status: m.offices_status,
    measurement_source: m.source,
    measurement_confidence: m.confidence,
    google_maps_url: g.google_maps_url || null,
    google_earth_url: g.google_earth_url || null,
    address: g.address || null,
    latitude: numOrNull(g.latitude),
    longitude: numOrNull(g.longitude),
    visual_notes: g.visual_notes || null,
    measurement_notes: m.notes || null,
    target_notes: t.notes || null,
    uploaded_file_name: g.fileName || null,
    uploaded_file_url: g.fileName || null,
    geojson_data: featureCollection,
    geo_feature_type: g.polygons.length > 0 ? "file_kml_geojson" : null,
    geo_area_sqm: geoArea,
    compatibility_score: compat.score,
    compatibility_status: compat.status,
    missing_data: { missing: compat.missing, warnings: compat.warnings },
    suggested_next_action: compat.suggested,
    converted_to_opportunity: false,
  } as Record<string, unknown>);

  const saveOpportunity = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .insert(buildOpportunityPayload() as never)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Opportunità salvata");
      qc.invalidateQueries({ queryKey: ["opps-all"] });
      qc.invalidateQueries({ queryKey: ["dashboard-opps"] });
      navigate({ to: "/opportunita/$id", params: { id: data!.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDraft = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("measurement_drafts" as never)
        .insert(buildDraftPayload() as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bozza misurazione salvata");
      qc.invalidateQueries({ queryKey: ["measurement-drafts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goNext = () => setStep((s) => Math.min(4, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  return (
    <>
      <PageHeader
        title="Misuratore capannoni"
        subtitle="Flusso guidato: parametri → strumenti esterni → misurazione → compatibilità."
        actions={
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card text-muted-foreground">
            <Ruler className="w-4 h-4" /> Strumento operativo
          </span>
        }
      />

      <div className="p-4 md:p-8 space-y-6">
        <Stepper step={step} onJump={setStep} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {step === 1 && (
              <Card title="Step 1 — Parametri di ricerca cliente">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nome ricerca"><Input value={t.search_name} onChange={(v) => setT({ ...t, search_name: v })} placeholder="Es. Ricerca capannone Treviso" /></Field>
                  <Field label="Cliente / referente"><Input value={t.client_name} onChange={(v) => setT({ ...t, client_name: v })} /></Field>
                  <Field label="Comune"><Input value={t.city} onChange={(v) => setT({ ...t, city: v })} /></Field>
                  <Field label="Provincia"><Input value={t.province} onChange={(v) => setT({ ...t, province: v })} /></Field>
                  <Field label="Zona industriale"><Input value={t.industrial_area} onChange={(v) => setT({ ...t, industrial_area: v })} /></Field>
                  <Field label="Destinazione d'uso"><Input value={t.intended_use} onChange={(v) => setT({ ...t, intended_use: v })} /></Field>
                  <Field label="Mq coperti richiesti (min)"><Input type="number" value={t.covered_min} onChange={(v) => setT({ ...t, covered_min: v })} /></Field>
                  <Field label="Mq coperti (max, opzionale)"><Input type="number" value={t.covered_max} onChange={(v) => setT({ ...t, covered_max: v })} /></Field>
                  <Field label="Mq piazzale richiesti"><Input type="number" value={t.yard_min} onChange={(v) => setT({ ...t, yard_min: v })} /></Field>
                  <Field label="Altezza minima (m)"><Input type="number" step="any" value={t.height_min} onChange={(v) => setT({ ...t, height_min: v })} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <Checkbox label="Accesso bilici richiesto" checked={t.truck_access} onChange={(v) => setT({ ...t, truck_access: v })} />
                  <Checkbox label="Vicinanza autostrada" checked={t.near_highway} onChange={(v) => setT({ ...t, near_highway: v })} />
                  <Checkbox label="Vicinanza porto" checked={t.near_port} onChange={(v) => setT({ ...t, near_port: v })} />
                </div>
                <Field label="Note ricerca"><Textarea value={t.notes} onChange={(v) => setT({ ...t, notes: v })} rows={3} /></Field>
              </Card>
            )}

            {step === 2 && (
              <Card title="Step 2 — Apri e misura esternamente">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  Apri Google Earth o Google Maps, misura manualmente edificio e piazzale, poi torna qui per inserire i mq stimati o caricare un file <strong>KML / KMZ / GeoJSON</strong> generato manualmente. Nessun dato viene importato automaticamente da Google.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Indirizzo"><Input value={g.address} onChange={(v) => setG({ ...g, address: v })} placeholder="Via, Comune" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Latitudine"><Input type="number" step="any" value={g.latitude} onChange={(v) => setG({ ...g, latitude: v })} /></Field>
                    <Field label="Longitudine"><Input type="number" step="any" value={g.longitude} onChange={(v) => setG({ ...g, longitude: v })} /></Field>
                  </div>
                  <Field label="Link Google Maps">
                    <div className="flex gap-2">
                      <Input value={g.google_maps_url} onChange={(v) => setG({ ...g, google_maps_url: v })} placeholder="https://maps.google.com/…" />
                      <button type="button" onClick={() => pasteInto("google_maps_url")}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-md text-xs border bg-card hover:bg-accent">
                        Incolla
                      </button>
                    </div>
                  </Field>
                  <Field label="Link Google Earth">
                    <div className="flex gap-2">
                      <Input value={g.google_earth_url} onChange={(v) => setG({ ...g, google_earth_url: v })} />
                      <button type="button" onClick={() => pasteInto("google_earth_url")}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-md text-xs border bg-card hover:bg-accent">
                        Incolla
                      </button>
                    </div>
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <ExtBtn href={mapsHref} disabled={!mapsHref}>Apri Google Maps</ExtBtn>
                  <ExtBtn href={earthWebHref}>Apri Google Earth Web</ExtBtn>
                  <ExtBtn href={earthProHref}>Apri Google Earth Pro</ExtBtn>
                  <button type="button" onClick={copyAddress}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent">
                    <Copy className="w-4 h-4" /> Copia indirizzo / coordinate
                  </button>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card title="Step 3 — Inserisci o importa misurazione">
                <div className="flex flex-wrap gap-1 border-b">
                  <Tab active={tab === "manuale"} onClick={() => setTab("manuale")} icon={PencilRuler}>Inserimento manuale</Tab>
                  <Tab active={tab === "file"} onClick={() => setTab("file")} icon={Upload}>Import file</Tab>
                  <Tab active={tab === "coordinate"} onClick={() => setTab("coordinate")} icon={MapPin}>Coordinate e note</Tab>
                </div>

                {tab === "manuale" && (
                  <div className="space-y-3 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Mq coperti misurati"><Input type="number" value={m.covered} onChange={(v) => setM({ ...m, covered: v })} /></Field>
                      <Field label="Mq piazzale misurati"><Input type="number" value={m.yard} onChange={(v) => setM({ ...m, yard: v })} /></Field>
                      <Field label="Lunghezza edificio (m)"><Input type="number" step="any" value={m.length} onChange={(v) => setM({ ...m, length: v })} /></Field>
                      <Field label="Larghezza edificio (m)"><Input type="number" step="any" value={m.width} onChange={(v) => setM({ ...m, width: v })} /></Field>
                      <Field label="Altezza interna stimata (m)"><Input type="number" step="any" value={m.estimated_height} onChange={(v) => setM({ ...m, estimated_height: v })} /></Field>
                      <Field label="Altezza interna confermata (m)"><Input type="number" step="any" value={m.internal_height} onChange={(v) => setM({ ...m, internal_height: v })} /></Field>
                      <Field label="Accesso bilici">
                        <Select value={m.truck_access_status} onChange={(v) => setM({ ...m, truck_access_status: v as Measured["truck_access_status"] })} options={TRISTATE as never} />
                      </Field>
                      <Field label="Presenza uffici">
                        <Select value={m.offices_status} onChange={(v) => setM({ ...m, offices_status: v as Measured["offices_status"] })} options={TRISTATE as never} />
                      </Field>
                      <Field label="Fonte misura">
                        <Select value={m.source} onChange={(v) => setM({ ...m, source: v })} options={MEASUREMENT_SOURCES as never} />
                      </Field>
                      <Field label="Precisione misura">
                        <Select value={m.confidence} onChange={(v) => setM({ ...m, confidence: v })} options={CONFIDENCE as never} />
                      </Field>
                    </div>
                    <Field label="Note misurazione"><Textarea value={m.notes} onChange={(v) => setM({ ...m, notes: v })} rows={3} /></Field>
                  </div>
                )}

                {tab === "file" && (
                  <div className="space-y-3 pt-3">
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md py-8 cursor-pointer hover:bg-accent/40 text-sm">
                      <Upload className="w-4 h-4" />
                      <span>
                        {parsing
                          ? "Analisi in corso…"
                          : g.fileName
                            ? `File: ${g.fileName}`
                            : "Carica file .geojson, .kml o .kmz"}
                      </span>
                      <input type="file" accept=".geojson,.json,.kml,.kmz"
                        className="hidden"
                        disabled={parsing}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onFile(f);
                          e.target.value = "";
                        }} />
                    </label>

                    {g.fileName && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {g.fileName}</span>
                        <button type="button" onClick={clearFile} className="inline-flex items-center gap-1 hover:text-foreground">
                          <Trash2 className="w-3.5 h-3.5" /> Rimuovi
                        </button>
                      </div>
                    )}

                    {g.polygons.length > 0 && (
                      <PolygonsTable
                        polys={g.polygons}
                        onUpdate={updatePolygon}
                        onRemove={removePolygon}
                        agg={polyAgg}
                      />
                    )}

                    <p className="text-[11px] text-muted-foreground">
                      Per KMZ, esporta in formato KML da Google Earth se il file zippato non risulta leggibile.
                      Solo poligoni chiusi vengono misurati: punti e linee sono registrati ma non producono mq.
                    </p>
                  </div>
                )}

                {tab === "coordinate" && (
                  <div className="space-y-3 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Latitudine"><Input type="number" step="any" value={g.latitude} onChange={(v) => setG({ ...g, latitude: v })} /></Field>
                      <Field label="Longitudine"><Input type="number" step="any" value={g.longitude} onChange={(v) => setG({ ...g, longitude: v })} /></Field>
                      <Field label="Link Google Maps"><Input value={g.google_maps_url} onChange={(v) => setG({ ...g, google_maps_url: v })} /></Field>
                      <Field label="Link Google Earth"><Input value={g.google_earth_url} onChange={(v) => setG({ ...g, google_earth_url: v })} /></Field>
                    </div>
                    <Field label="Note visive (cosa si vede dall'alto, attività, mezzi, accessi)">
                      <Textarea value={g.visual_notes} onChange={(v) => setG({ ...g, visual_notes: v })} rows={4} />
                    </Field>
                  </div>
                )}
              </Card>
            )}

            {step === 4 && (
              <Card title="Step 4 — Esito e salvataggio">
                <div className="flex items-center justify-between">
                  {statusBadge(compat.status)}
                  <div className="text-3xl font-semibold tabular-nums">{compat.score}%</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Compare label="Mq coperti" req={t.covered_min} got={mEffective.covered} unit="m²" diff={compat.diffCovered} />
                  <Compare label="Mq piazzale" req={t.yard_min} got={mEffective.yard} unit="m²" diff={compat.diffYard} />
                  <Compare label="Altezza interna" req={t.height_min} got={m.internal_height || m.estimated_height} unit="m" />
                  <Compare label="Accesso bilici" req={t.truck_access ? "Sì" : "—"} got={m.truck_access_status === "non_verificato" ? "Da verificare" : (m.truck_access_status === "si" ? "Sì" : "No")} unit="" />
                </div>

                {g.polygons.length > 0 && (
                  <div className="pt-3 text-xs text-muted-foreground">
                    Poligoni dal file <strong>{g.fileName}</strong>: edificio {Math.round(polyAgg.edificio).toLocaleString("it-IT")} m² · piazzale {Math.round(polyAgg.piazzale).toLocaleString("it-IT")} m² · area totale {Math.round(polyAgg.area_totale).toLocaleString("it-IT")} m²
                  </div>
                )}

                {compat.missing.length > 0 && (
                  <div className="pt-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Dati mancanti</div>
                    <ul className="text-sm list-disc pl-5 space-y-0.5">{compat.missing.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}
                {compat.warnings.length > 0 && (
                  <div className="pt-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Criticità da verificare</div>
                    <ul className="text-sm list-disc pl-5 space-y-0.5 text-amber-600">{compat.warnings.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                )}

                <div className="mt-3 p-3 rounded-md border border-primary/30 bg-primary/5 text-sm">
                  <div className="text-[11px] uppercase tracking-wide text-primary mb-1">Prossima azione suggerita</div>
                  {compat.suggested}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => saveOpportunity.mutate()}
                    disabled={saveOpportunity.isPending}
                    className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    {saveOpportunity.isPending ? "Salvataggio…" : "Salva come opportunità"}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveDraft.mutate()}
                    disabled={saveDraft.isPending}
                    className="inline-flex items-center justify-center gap-2 border bg-card text-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-accent disabled:opacity-50">
                    <FileText className="w-4 h-4" />
                    {saveDraft.isPending ? "Salvataggio…" : "Salva come bozza misurazione"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground pt-3">
                  La misurazione indica solo compatibilità tecnica. Lo stato "Già in vendita" non viene mai assegnato automaticamente e va impostato manualmente solo con fonte verificabile.
                </p>
              </Card>
            )}

            {/* Step nav */}
            <div className="flex items-center justify-between">
              <button
                type="button" onClick={goPrev} disabled={step === 1}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
              {step < 4 ? (
                <button
                  type="button" onClick={goNext}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium">
                  Avanti <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <Link to="/opportunita" className="text-xs text-muted-foreground hover:underline">
                  Vai alla lista opportunità →
                </Link>
              )}
            </div>
          </div>

          {/* Sticky compatibility summary */}
          <aside className="lg:col-span-4 lg:sticky lg:top-4 self-start space-y-3">
            <Card title="Riepilogo compatibilità">
              <div className="flex items-center justify-between">
                {statusBadge(compat.status)}
                <div className="text-2xl font-semibold tabular-nums">{compat.score}%</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 text-sm">
                <Metric label="Δ mq coperti" value={compat.diffCovered} unit="mq" />
                <Metric label="Δ mq piazzale" value={compat.diffYard} unit="mq" />
              </div>
              {g.polygons.length > 0 && (
                <div className="pt-3 text-xs text-muted-foreground space-y-0.5">
                  <div>Edificio (file): <strong>{Math.round(polyAgg.edificio).toLocaleString("it-IT")} m²</strong></div>
                  <div>Piazzale (file): <strong>{Math.round(polyAgg.piazzale).toLocaleString("it-IT")} m²</strong></div>
                  <div>Area totale (file): <strong>{Math.round(polyAgg.area_totale).toLocaleString("it-IT")} m²</strong></div>
                </div>
              )}
              <div className="pt-3 text-xs text-muted-foreground">
                {t.search_name || "Ricerca senza nome"} · {t.client_name || "—"}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ---------- Tabella poligoni ---------- */

function PolygonsTable({
  polys,
  onUpdate,
  onRemove,
  agg,
}: {
  polys: ParsedPolygon[];
  onUpdate: (id: string, patch: Partial<ParsedPolygon>) => void;
  onRemove: (id: string) => void;
  agg: { edificio: number; piazzale: number; area_totale: number };
}) {
  const polyCount = polys.filter((p) => p.geometryType === "Polygon").length;
  return (
    <div className="rounded-md border bg-background">
      <div className="px-3 py-2 border-b flex items-center justify-between text-xs">
        <div className="font-medium">Poligoni rilevati: {polyCount}</div>
        <div className="text-muted-foreground hidden sm:block">
          Edificio {Math.round(agg.edificio).toLocaleString("it-IT")} m² · Piazzale {Math.round(agg.piazzale).toLocaleString("it-IT")} m² · Totale {Math.round(agg.area_totale).toLocaleString("it-IT")} m²
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Nome</th>
              <th className="text-left px-3 py-2 font-medium">Tipo</th>
              <th className="text-right px-3 py-2 font-medium">m²</th>
              <th className="text-right px-3 py-2 font-medium">ha</th>
              <th className="text-left px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {polys.map((p) => {
              const measurable = p.geometryType === "Polygon" && p.areaSqm > 0;
              return (
                <tr key={p.id} className={!measurable ? "opacity-60" : ""}>
                  <td className="px-3 py-2">
                    <input
                      value={p.name}
                      onChange={(e) => onUpdate(p.id, { name: e.target.value })}
                      className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
                    />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{p.geometryType}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{measurable ? Math.round(p.areaSqm).toLocaleString("it-IT") : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{measurable ? (p.areaSqm / 10000).toFixed(2) : "—"}</td>
                  <td className="px-3 py-2">
                    <select
                      value={p.assigned}
                      disabled={!measurable}
                      onChange={(e) => onUpdate(p.id, { assigned: e.target.value as PolyCategory })}
                      className="w-full px-2 py-1 text-xs bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {POLY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => onRemove(p.id)} title="Rimuovi poligono"
                      className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t text-[11px] text-muted-foreground sm:hidden">
        Totali: Edificio {Math.round(agg.edificio).toLocaleString("it-IT")} m² · Piazzale {Math.round(agg.piazzale).toLocaleString("it-IT")} m² · Area totale {Math.round(agg.area_totale).toLocaleString("it-IT")} m²
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Stepper({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <ol className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {STEPS.map((s) => {
        const active = step === s.n;
        const done = step > s.n;
        return (
          <li key={s.n}>
            <button
              type="button"
              onClick={() => onJump(s.n)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors ${
                active ? "bg-primary text-primary-foreground border-primary"
                : done ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                : "bg-card border-border text-muted-foreground hover:bg-accent"
              }`}>
              <span className={`shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md border text-xs font-semibold ${
                active ? "bg-primary-foreground/20 border-primary-foreground/40"
                : done ? "bg-emerald-500/20 border-emerald-500/40"
                : "bg-background border-border"
              }`}>{s.n}</span>
              <span className="text-sm font-medium truncate">{s.label}</span>
              <s.Icon className="w-4 h-4 ml-auto opacity-70" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border rounded-lg p-4 md:p-6 space-y-3">
      <h2 className="font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Input({
  value, onChange, type = "text", placeholder, step,
}: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; step?: string }) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
function Textarea({
  value, onChange, rows = 3,
}: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Checkbox({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
function Tab({
  active, onClick, children, icon: Icon,
}: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px ${
        active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}>
      <Icon className="w-4 h-4" /> {children}
    </button>
  );
}
function ExtBtn({ href, children, disabled }: { href: string | null; children: React.ReactNode; disabled?: boolean }) {
  if (!href || disabled) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-muted text-muted-foreground opacity-60 cursor-not-allowed">
        <ExternalLink className="w-4 h-4" /> {children}
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent">
      <ExternalLink className="w-4 h-4" /> {children}
    </a>
  );
}
function Compare({
  label, req, got, unit, diff,
}: { label: string; req: string | null; got: string | null; unit: string; diff?: number | null }) {
  const r = req || "—";
  const gv = got || "—";
  return (
    <div className="border rounded-md p-3 bg-background">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
        <span>Richiesto: <strong className="tabular-nums">{r}{r !== "—" ? ` ${unit}` : ""}</strong></span>
        <span>Misurato: <strong className="tabular-nums">{gv}{gv !== "—" ? ` ${unit}` : ""}</strong></span>
      </div>
      {diff != null && (
        <div className={`mt-1 text-xs tabular-nums ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          Δ {diff >= 0 ? "+" : ""}{diff} {unit}
        </div>
      )}
    </div>
  );
}
function Metric({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-md border bg-background p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums text-foreground">{value == null ? "—" : `${value >= 0 ? "+" : ""}${value} ${unit}`}</div>
    </div>
  );
}

// `POLY_CAT_LABEL` is exported indirectly via UI; keep import-friendly export of constants if needed elsewhere.
export { POLY_CAT_LABEL };
