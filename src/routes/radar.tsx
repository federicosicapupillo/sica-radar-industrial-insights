import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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

function OsmView() {
  const navigate = useNavigate();
  const [lat, setLat] = useState("45.4642");
  const [lon, setLon] = useState("9.1900");
  const [radiusKm, setRadiusKm] = useState("3");
  const [targetSqm, setTargetSqm] = useState("4000");
  const [tolerancePct, setTolerancePct] = useState("30");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OsmCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [meta, setMeta] = useState<Omit<OverpassResult, "candidates"> | null>(null);
  const runOverpass = useServerFn(searchOverpass);

  const target = Number(targetSqm) || 0;
  const tol = Number(tolerancePct) || 0;
  const minSqm = Math.max(0, Math.round(target * (1 - tol / 100)));
  const maxSqm = Math.round(target * (1 + tol / 100));

  async function runSearch() {
    setError(null);
    setResults(null);
    setMeta(null);
    const la = Number(lat), lo = Number(lon), rk = Number(radiusKm);
    if (!Number.isFinite(la) || !Number.isFinite(lo) || !Number.isFinite(rk) || rk <= 0) {
      setError("Inserisci lat/lon validi e raggio > 0");
      return;
    }
    if (target <= 0) {
      setError("Inserisci mq target > 0");
      return;
    }
    setLoading(true);
    try {
      const res = await runOverpass({
        data: { lat: la, lon: lo, radiusKm: rk, targetSqm: target, tolerancePct: tol },
      });
      const { candidates, ...rest } = res;
      setMeta(rest);
      if (!res.ok) {
        setError(res.error ?? "Ricerca OSM non completata. Overpass non disponibile o troppo lento. Riprova riducendo raggio o cambiando zona.");
        setResults([]);
        return;
      }
      setResults(candidates);
      if (candidates.length === 0) toast.info("Nessun candidato OSM nel range mq.");
      else toast.success(`${candidates.length} candidati trovati`);
    } catch (e: any) {
      setError(e?.message ?? "Errore Overpass");
    } finally {
      setLoading(false);
    }
  }


  async function saveCandidate(c: OsmCandidate) {
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
          suggested_next_action: "Verificare occupante, altezza, accesso bilici e proprietà",
          last_measured_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Candidato salvato come opportunità");
      navigate({ to: "/opportunita/$id", params: { id: data.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Errore salvataggio");
    } finally {
      setSavingId(null);
    }
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Field label="Latitudine" value={lat} onChange={setLat} placeholder="45.4642" />
          <Field label="Longitudine" value={lon} onChange={setLon} placeholder="9.1900" />
          <Field label="Raggio (km)" value={radiusKm} onChange={setRadiusKm} placeholder="3" type="number" />
          <Field label="Mq target" value={targetSqm} onChange={setTargetSqm} placeholder="4000" type="number" />
          <Field label="Tolleranza %" value={tolerancePct} onChange={setTolerancePct} placeholder="30" type="number" />
        </div>
        <div className="text-xs text-muted-foreground">
          Range mq calcolato: <b>{minSqm.toLocaleString("it-IT")}</b> – <b>{maxSqm.toLocaleString("it-IT")}</b> mq
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runSearch}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Avvia ricerca reale OSM
          </button>
          <a
            href={`https://www.google.com/maps?q=${lat},${lon}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-md border bg-card hover:bg-accent"
          >
            Apri centro su Maps <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
      </section>

      {meta && (
        <section className="bg-card border rounded-lg p-4 text-xs space-y-1">
          <div className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Stato fonte dati
          </div>
          <div><span className="text-muted-foreground">Modalità:</span> OSM reale server-side</div>
          <div><span className="text-muted-foreground">Endpoint usato:</span> {meta.endpointUsed ?? "—"}</div>
          <div><span className="text-muted-foreground">Tempo risposta:</span> {meta.responseTimeMs} ms{meta.cached ? " (cache)" : ""}</div>
          <div><span className="text-muted-foreground">Risultati grezzi:</span> {meta.rawCount}</div>
          <div><span className="text-muted-foreground">Risultati compatibili:</span> {results?.length ?? 0}</div>
          {meta.error && <div className="text-destructive"><span className="text-muted-foreground">Errore endpoint:</span> {meta.error}</div>}
        </section>
      )}

      {/* Results */}
      {results && (
        <section className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {results.length} candidati nel range mq • fonte OpenStreetMap/Overpass
          </div>
          {results.map((c) => {
            const status = compatStatusFromScore(c.compatibility);
            return (
              <article key={c.id} className="bg-card border rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {c.name ?? <span className="text-muted-foreground italic">Senza nome</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                      <span>OSM {c.id}</span>
                      {c.tags.building && <span>building={c.tags.building}</span>}
                      {c.tags.landuse && <span>landuse={c.tags.landuse}</span>}
                      {c.tags.industrial && <span>industrial={c.tags.industrial}</span>}
                      <span>lat {c.lat.toFixed(5)}, lon {c.lon.toFixed(5)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${COMPAT_CLS[status]}`}>
                      {c.compatibility}% · {COMPAT_LABEL[status]}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border bg-amber-500/10 text-amber-700 border-amber-500/30">
                      Fonte OSM — da verificare
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Area stimata" value={`${c.areaSqm.toLocaleString("it-IT")} mq`} />
                  <Stat label="Differenza target" value={`${c.diffPct >= 0 ? "+" : ""}${c.diffPct.toFixed(0)}%`} />
                  <Stat label="Confidence" value="media" />
                  <Stat label="Fonte" value="OpenStreetMap" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://www.google.com/maps?q=${c.lat},${c.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
                  >
                    Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://earth.google.com/web/@${c.lat},${c.lon},150a,500d,35y,0h,0t,0r`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
                  >
                    Google Earth <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/${c.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
                  >
                    OSM <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => saveCandidate(c)}
                    disabled={savingId === c.id}
                    className="ml-auto inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {savingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salva come opportunità
                  </button>
                </div>
              </article>
            );
          })}
        </section>
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
