import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Radar, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/radar")({
  component: RadarPage,
  head: () => ({
    meta: [
      { title: "Radar ricerca capannoni · Sica Industrial Radar" },
      { name: "description", content: "Stato fonte dati del Radar e flusso operativo di ricerca capannoni." },
    ],
  }),
});

// Stato attuale: nessuna API di ricerca reale collegata.
// La ricerca avviene oggi manualmente (Google Maps/Earth + Misuratore + inserimento opportunità).
const DATA_SOURCE = {
  currentSource: "Inserimento manuale + Misuratore (KML/KMZ, GeoJSON)",
  isReal: false, // i risultati di "ricerca automatica" non esistono ancora
  apiConfigured: false,
  provider: "Overpass API / OpenStreetMap (previsto, non attivo)",
  missing: [
    "Endpoint Overpass configurato (server function dedicata)",
    "Mapping tag OSM → categoria capannone (building=industrial, landuse=industrial, man_made=warehouse)",
    "Filtri geografici (bounding box per provincia/comune)",
    "Deduplica vs opportunità esistenti su latitudine/longitudine",
    "Rate limiting e cache risultati Overpass",
  ],
} as const;

function RadarPage() {
  return (
    <>
      <PageHeader
        title="Radar ricerca capannoni"
        subtitle="Stato fonte dati e flusso operativo di scouting."
        actions={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Dati demo
          </span>
        }
      />

      <div className="p-4 md:p-8 space-y-6">
        {/* Banner demo */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-foreground">Modalità dimostrativa</div>
            <p className="text-muted-foreground mt-1">
              Il Radar non esegue ancora una ricerca automatica di capannoni. Tutti i dati
              dell'app provengono da inserimento manuale e dal <Link to="/misuratore" className="text-primary hover:underline">Misuratore</Link>.
              Nessuno scraping di Google Maps / Google Earth / portali immobiliari è attivo, in
              linea con le regole del progetto.
            </p>
          </div>
        </div>

        {/* Stato fonte dati */}
        <section className="bg-card border rounded-lg overflow-hidden">
          <header className="px-5 py-4 border-b flex items-center gap-2">
            <Radar className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Stato fonte dati</h2>
          </header>
          <div className="divide-y">
            <Row label="Fonte attuale" value={DATA_SOURCE.currentSource} />
            <Row
              label="Dati reali"
              value={
                DATA_SOURCE.isReal ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Sì</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600"><XCircle className="w-4 h-4" /> No — flusso manuale</span>
                )
              }
            />
            <Row
              label="API configurata"
              value={
                DATA_SOURCE.apiConfigured ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Sì</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="w-4 h-4" /> No</span>
                )
              }
            />
            <Row label="Provider previsto" value={DATA_SOURCE.provider} />
          </div>
        </section>

        {/* Cosa manca */}
        <section className="bg-card border rounded-lg overflow-hidden">
          <header className="px-5 py-4 border-b flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Cosa manca per attivare la ricerca reale</h2>
          </header>
          <ul className="px-5 py-4 space-y-2 text-sm">
            {DATA_SOURCE.missing.map((m) => (
              <li key={m} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{m}</span>
              </li>
            ))}
          </ul>
          <div className="px-5 pb-4 text-xs text-muted-foreground">
            L'integrazione Overpass/OSM è prevista come server function (no chiavi lato client,
            no scraping). I risultati verranno mostrati qui con badge fonte e mai promossi
            automaticamente a "Già in vendita".
          </div>
        </section>

        {/* Flusso attuale */}
        <section className="bg-card border rounded-lg overflow-hidden">
          <header className="px-5 py-4 border-b">
            <h2 className="font-semibold">Flusso operativo attuale</h2>
          </header>
          <ol className="px-5 py-4 space-y-3 text-sm list-decimal list-inside">
            <li>
              Apri <Link to="/misuratore" className="text-primary hover:underline">Misuratore</Link> e inserisci i parametri di ricerca.
            </li>
            <li>
              Misura il capannone su Google Maps/Earth (manuale) o carica un file KML/KMZ/GeoJSON.
            </li>
            <li>Assegna i poligoni a edificio coperto / piazzale / altro.</li>
            <li>Salva come opportunità: la compatibilità viene calcolata automaticamente.</li>
            <li>
              Dalla scheda <Link to="/opportunita" className="text-primary hover:underline">Opportunità</Link> identifica l'azienda occupante e registra le chiamate.
            </li>
          </ol>
        </section>

        {/* Link utili (manuali) */}
        <section className="bg-muted/30 border border-dashed rounded-lg p-4 text-sm">
          <div className="font-medium text-foreground mb-1">Strumenti esterni (apertura manuale)</div>
          <div className="text-muted-foreground mb-3">
            Nessuna chiamata automatica. Le risorse seguenti vanno aperte e usate manualmente dall'operatore.
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
            >
              Google Maps <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://earth.google.com/web/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
            >
              Google Earth <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://overpass-turbo.eu/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent"
            >
              Overpass Turbo (OSM) <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>
      </div>
    </>
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
