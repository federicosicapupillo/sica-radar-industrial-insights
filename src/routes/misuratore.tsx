import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import {
  Ruler,
  Save,
  ExternalLink,
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

const FEATURE_TYPES = [
  { value: "edificio", label: "Edificio coperto" },
  { value: "piazzale", label: "Piazzale" },
  { value: "area_totale", label: "Area totale" },
] as const;

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
  fileUrl: string;
  fileArea: number | null;
  feature_type: string;
  geometry: unknown | null;
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
  fileName: "", fileUrl: "", fileArea: null,
  feature_type: "edificio", geometry: null,
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

// Spherical polygon area in m² (ring of [lng,lat])
function polygonAreaM2(ring: [number, number][]): number {
  if (ring.length < 3) return 0;
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

function parseGeoJSONForArea(json: unknown): { area: number; geometry: unknown } | null {
  try {
    type Geom = { type: string; coordinates: unknown };
    const visit = (g: Geom | null | undefined): number => {
      if (!g) return 0;
      if (g.type === "Polygon") {
        const coords = g.coordinates as [number, number][][];
        return coords[0] ? polygonAreaM2(coords[0]) : 0;
      }
      if (g.type === "MultiPolygon") {
        const coords = g.coordinates as [number, number][][][];
        return coords.reduce((a, poly) => a + (poly[0] ? polygonAreaM2(poly[0]) : 0), 0);
      }
      return 0;
    };
    const j = json as { type?: string; features?: Array<{ geometry: Geom }>; geometry?: Geom };
    if (j.type === "FeatureCollection" && Array.isArray(j.features)) {
      const area = j.features.reduce((a, f) => a + visit(f.geometry), 0);
      return { area, geometry: json };
    }
    if (j.type === "Feature" && j.geometry) return { area: visit(j.geometry), geometry: json };
    if (j.type === "Polygon" || j.type === "MultiPolygon") return { area: visit(j as Geom), geometry: json };
  } catch { /* ignore */ }
  return null;
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
  const navigate = useNavigate();
  const qc = useQueryClient();

  const compat = useMemo(() => computeCompatibility(t, m), [t, m]);

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

  const onFile = async (file: File) => {
    setG((p) => ({ ...p, fileName: file.name }));
    const ext = file.name.toLowerCase().split(".").pop() || "";
    if (ext === "geojson" || ext === "json") {
      try {
        const text = await file.text();
        const parsed = parseGeoJSONForArea(JSON.parse(text));
        if (parsed && parsed.area > 0) {
          setG((p) => ({ ...p, fileArea: parsed.area, geometry: parsed.geometry }));
          toast.success(`Area calcolata: ${Math.round(parsed.area)} m²`);
        } else {
          toast.message("File GeoJSON caricato — nessun poligono valido trovato");
        }
      } catch {
        toast.error("GeoJSON non valido");
      }
    } else if (ext === "kml" || ext === "kmz") {
      toast.message("File caricato — analisi geometria KML/KMZ da completare");
    } else {
      toast.error("Formato non supportato (usa .geojson, .kml, .kmz)");
    }
  };

  const buildOpportunityPayload = () => {
    const titleBase =
      t.search_name || t.client_name || t.city || t.industrial_area || g.address || "Capannone misurato";
    const measuredCovered = numOrNull(m.covered) ?? (g.fileArea != null && g.feature_type === "edificio" ? Math.round(g.fileArea) : null);
    const measuredYard = numOrNull(m.yard) ?? (g.fileArea != null && g.feature_type === "piazzale" ? Math.round(g.fileArea) : null);
    return {
      title: `${titleBase}${m.covered ? ` — ${m.covered} mq coperti` : ""}`,
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
      // misuratore fields
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
      geo_feature_type: g.fileArea != null ? g.feature_type : null,
      geo_area_sqm: g.fileArea != null ? Math.round(g.fileArea) : null,
      geometry_data: g.geometry ?? null,
      geojson_data: g.geometry ?? null,
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
    measured_covered_sqm: numOrNull(m.covered),
    measured_yard_sqm: numOrNull(m.yard),
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
    geojson_data: g.geometry ?? null,
    geo_feature_type: g.fileArea != null ? g.feature_type : null,
    geo_area_sqm: g.fileArea != null ? Math.round(g.fileArea) : null,
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
                      <span>{g.fileName ? `File: ${g.fileName}` : "Carica file .geojson, .kml o .kmz"}</span>
                      <input type="file" accept=".geojson,.json,.kml,.kmz"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
                    </label>
                    {g.fileName && !g.fileArea && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" /> File caricato — analisi geometria da completare per KML/KMZ.
                      </div>
                    )}
                    {g.fileArea != null && (
                      <div className="rounded-md border bg-background p-3 space-y-3">
                        <div className="text-sm">
                          Area poligono calcolata: <strong>{Math.round(g.fileArea).toLocaleString("it-IT")} m²</strong>
                        </div>
                        <Field label="Questo poligono rappresenta">
                          <Select value={g.feature_type} onChange={(v) => setG({ ...g, feature_type: v })} options={FEATURE_TYPES as never} />
                        </Field>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setM({ ...m, covered: String(Math.round(g.fileArea!)) })}
                            className="text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent">
                            Usa come mq coperti
                          </button>
                          <button type="button" onClick={() => setM({ ...m, yard: String(Math.round(g.fileArea!)) })}
                            className="text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent">
                            Usa come mq piazzale
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Per KML/KMZ il file viene registrato ma l'area non è calcolata automaticamente.
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
                  <Compare label="Mq coperti" req={t.covered_min} got={m.covered} unit="m²" diff={compat.diffCovered} />
                  <Compare label="Mq piazzale" req={t.yard_min} got={m.yard} unit="m²" diff={compat.diffYard} />
                  <Compare label="Altezza interna" req={t.height_min} got={m.internal_height || m.estimated_height} unit="m" />
                  <Compare label="Accesso bilici" req={t.truck_access ? "Sì" : "—"} got={m.truck_access_status === "non_verificato" ? "Da verificare" : (m.truck_access_status === "si" ? "Sì" : "No")} unit="" />
                </div>

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
                : "bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className={`w-7 h-7 grid place-items-center rounded-full text-xs font-semibold ${
                active ? "bg-primary-foreground/20" : done ? "bg-emerald-500/20" : "bg-muted"
              }`}>{s.n}</span>
              <span className="flex items-center gap-2 text-sm font-medium">
                <s.Icon className="w-4 h-4" /> {s.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border rounded-lg">
      <header className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </header>
      <div className="p-4 space-y-3">{children}</div>
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

function Input({ value, onChange, type = "text", step, placeholder }:
  { value: string; onChange: (v: string) => void; type?: string; step?: string; placeholder?: string }) {
  return (
    <input
      type={type} step={step} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea value={value} rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
  );
}

function Select({ value, onChange, options }:
  { value: string; onChange: (v: string) => void; options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-input text-primary focus:ring-ring" />
      <span>{label}</span>
    </label>
  );
}

function ExtBtn({ href, children, disabled }: { href: string | null; children: React.ReactNode; disabled?: boolean }) {
  if (!href || disabled) {
    return (
      <button type="button" disabled
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card text-muted-foreground opacity-50 cursor-not-allowed">
        <ExternalLink className="w-4 h-4" /> {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent">
      <ExternalLink className="w-4 h-4" /> {children}
    </a>
  );
}

function Tab({ active, onClick, children, icon: Icon }:
  { active: boolean; onClick: () => void; children: React.ReactNode; icon: typeof PencilRuler }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 -mb-px border-b-2 text-sm font-medium ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}>
      <Icon className="w-4 h-4" /> {children}
    </button>
  );
}

function Metric({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  const fmt = value == null ? "—" : `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("it-IT")} ${unit}`;
  const cls = value == null ? "text-muted-foreground" : value >= 0 ? "text-emerald-600" : "text-red-600";
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${cls}`}>{fmt}</div>
    </div>
  );
}

function Compare({ label, req, got, unit, diff }:
  { label: string; req: string; got: string; unit: string; diff?: number | null }) {
  const fmt = (v: string) => v === "" || v == null ? "—" : `${v}${unit ? " " + unit : ""}`;
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm flex items-center justify-between gap-3 mt-1">
        <span><span className="text-muted-foreground">Richiesto:</span> {fmt(req)}</span>
        <span><span className="text-muted-foreground">Misurato:</span> {fmt(got)}</span>
      </div>
      {diff != null && (
        <div className={`mt-1 text-xs tabular-nums ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          Δ {diff >= 0 ? "+" : ""}{Math.round(diff).toLocaleString("it-IT")} {unit}
        </div>
      )}
    </div>
  );
}
