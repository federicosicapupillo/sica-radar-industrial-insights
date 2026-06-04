import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { MapPin, ExternalLink, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/mappa")({
  component: MappaPage,
});

function MappaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["opps-geo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id,title,city,province,latitude,longitude,opportunity_status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const withCoords = (data ?? []).filter((o) => o.latitude != null && o.longitude != null);
  const without = (data ?? []).filter((o) => o.latitude == null || o.longitude == null);

  return (
    <>
      <PageHeader
        title="Mappa opportunità"
        subtitle="Visualizza geograficamente gli immobili con coordinate disponibili."
      />

      <div className="p-4 md:p-8 space-y-6">
        <div className="bg-muted/30 border border-dashed rounded-lg p-6 text-center">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">Vista mappa in preparazione</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl mx-auto">
            La piattaforma è predisposta per l'integrazione futura con un provider mappe. Nessuno
            scraping da Google Maps o portali viene effettuato. Apri direttamente Google Maps dai link sotto.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground">Caricamento…</div>
        ) : (
          <>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Con coordinate ({withCoords.length})
              </h2>
              {withCoords.length === 0 ? (
                <div className="bg-card border rounded-lg p-6 text-sm text-muted-foreground">
                  Nessuna opportunità con coordinate GPS.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {withCoords.map((o) => (
                    <div key={o.id} className="bg-card border rounded-lg p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to="/opportunita/$id" params={{ id: o.id }} className="font-medium hover:text-primary">
                          {o.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {[o.city, o.province].filter(Boolean).join(", ") || "—"}
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground mt-1">
                          {o.latitude}, {o.longitude}
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {without.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Coordinate non disponibili ({without.length})
                </h2>
                <div className="bg-card border rounded-lg divide-y">
                  {without.slice(0, 30).map((o) => (
                    <Link key={o.id} to="/opportunita/$id" params={{ id: o.id }} className="block px-4 py-3 hover:bg-accent/40">
                      <div className="font-medium text-sm">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{[o.city, o.province].filter(Boolean).join(", ") || "—"}</div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
