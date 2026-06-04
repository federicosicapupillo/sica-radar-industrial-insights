import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CompatibilityBadge, MisuratoreTag } from "@/components/CompatibilityBadge";
import {
  isFromMisuratore,
  fmtOrMissing,
  MEASUREMENT_SOURCE_LABELS,
  CONFIDENCE_LABELS,
} from "@/lib/compatibility";
import {
  OPPORTUNITY_STATUS,
  PRIORITIES,
  PROPERTY_TYPES,
  PROPERTY_CONDITION,
  SOURCE_TYPES,
  ALREADY_FOR_SALE,
  labelOf,
  toneOf,
} from "@/lib/enums";
import { toast } from "sonner";
import { ArrowLeft, Archive, Star, Phone, Pencil, ExternalLink, Trash2, Ruler } from "lucide-react";

export const Route = createFileRoute("/opportunita/$id")({
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: opp, isLoading } = useQuery({
    queryKey: ["opp", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("opportunity_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateMut = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("opportunities").update(patch as never).eq("id", id);
      if (error) throw error;
      await supabase.from("activity_logs").insert({
        opportunity_id: id,
        action_type: "update",
        description: Object.entries(patch).map(([k, v]) => `${k}: ${v}`).join(", "),
      } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp", id] });
      qc.invalidateQueries({ queryKey: ["logs", id] });
      qc.invalidateQueries({ queryKey: ["opps-all"] });
      toast.success("Aggiornato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opps-all"] });
      toast.success("Opportunità eliminata");
      navigate({ to: "/opportunita" });
    },
  });

  if (isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  }
  if (!opp) {
    return (
      <div className="p-10 text-center">
        <p className="font-medium">Opportunità non trovata</p>
        <Link to="/opportunita" className="text-primary text-sm hover:underline mt-2 inline-block">← Torna alla lista</Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={opp.title}
        subtitle={[opp.city, opp.province].filter(Boolean).join(", ") || "Località non indicata"}
        actions={
          <>
            <Link to="/opportunita" className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent">
              <ArrowLeft className="w-4 h-4" /> Indietro
            </Link>
            <button
              onClick={() => updateMut.mutate({ opportunity_status: "interessante" })}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent"
            >
              <Star className="w-4 h-4" /> Interessante
            </button>
            <button
              onClick={() => updateMut.mutate({ opportunity_status: "contattato" })}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent"
            >
              <Phone className="w-4 h-4" /> Contattato
            </button>
            <button
              onClick={() => updateMut.mutate({ opportunity_status: "archiviato" })}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent"
            >
              <Archive className="w-4 h-4" /> Archivia
            </button>
            <button
              onClick={() => {
                if (confirm("Eliminare definitivamente questa opportunità?")) delMut.mutate();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        }
      />

      <div className="p-4 md:p-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card title="Riepilogo">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={labelOf(OPPORTUNITY_STATUS, opp.opportunity_status)} tone={toneOf(OPPORTUNITY_STATUS, opp.opportunity_status)} />
              <StatusBadge label={labelOf(PRIORITIES, opp.priority)} tone={toneOf(PRIORITIES, opp.priority)} />
              <StatusBadge label={labelOf(PROPERTY_TYPES, opp.property_type)} />
              <StatusBadge label={"Vendita: " + labelOf(ALREADY_FOR_SALE, opp.already_for_sale)} />
              {isFromMisuratore(opp) && <MisuratoreTag size="md" />}
              {(isFromMisuratore(opp) || opp.compatibility_score != null) && (
                <CompatibilityBadge score={opp.compatibility_score} status={opp.compatibility_status} size="md" />
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Cambia stato">
                <SelectInline value={opp.opportunity_status || ""} options={OPPORTUNITY_STATUS} onChange={(v) => updateMut.mutate({ opportunity_status: v })} />
              </Stat>
              <Stat label="Cambia priorità">
                <SelectInline value={opp.priority || ""} options={PRIORITIES} onChange={(v) => updateMut.mutate({ priority: v })} />
              </Stat>
            </div>
          </Card>

          {isFromMisuratore(opp) && <MeasurementCard opp={opp as unknown as OppRow} />}

          <Card title="Dati tecnici">
            <Grid>
              <Info label="Mq coperti" value={opp.covered_sqm} suffix=" m²" />
              <Info label="Piazzale esterno" value={opp.yard_sqm} suffix=" m²" />
              <Info label="Altezza interna" value={opp.internal_height} suffix=" m" />
              <Info label="Campate" value={opp.spans_count} />
              <Info label="Uffici" value={opp.has_offices == null ? null : opp.has_offices ? "Sì" : "No"} />
              <Info label="Mq uffici" value={opp.office_sqm} suffix=" m²" />
              <Info label="Accesso bilici" value={opp.truck_access == null ? null : opp.truck_access ? "Sì" : "No"} />
              <Info label="Portoni" value={opp.loading_doors} />
              <Info label="Carroponte" value={opp.has_crane == null ? null : opp.has_crane ? "Sì" : "No"} />
              <Info label="Potenza elettrica" value={opp.power_available} />
              <Info label="Stato immobile" value={labelOf(PROPERTY_CONDITION, opp.property_condition)} />
              <Info label="Destinazione d'uso" value={opp.intended_use} />
              <Info label="Vicinanza autostrada" value={opp.near_highway ? "Sì" : "—"} />
              <Info label="Vicinanza porto" value={opp.near_port ? "Sì" : "—"} />
              <Info label="Zona industriale" value={opp.near_industrial_area ? "Sì" : "—"} />
            </Grid>
          </Card>

          <Card title="Dati commerciali">
            <Grid>
              <Info label="Già in vendita" value={labelOf(ALREADY_FOR_SALE, opp.already_for_sale)} />
              <Info label="Prezzo richiesto" value={opp.asking_price ? `€ ${opp.asking_price}` : null} />
              <Info label="Canone affitto" value={opp.rent_price ? `€ ${opp.rent_price}/mese` : null} />
              <Info label="Azienda occupante" value={opp.occupying_company} />
              <Info label="Possibile proprietà" value={opp.possible_owner} />
              <Info label="Fonte" value={labelOf(SOURCE_TYPES, opp.source_type)} />
            </Grid>
            {opp.commercial_notes && (
              <div className="mt-4 p-3 bg-muted/40 rounded-md text-sm whitespace-pre-wrap">{opp.commercial_notes}</div>
            )}
          </Card>

          <Card title="Contatto">
            <Grid>
              <Info label="Nome" value={opp.contact_name} />
              <Info label="Telefono" value={opp.phone} />
              <Info label="Email" value={opp.email} />
            </Grid>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Link esterni">
            <div className="space-y-2">
              <ExtLink href={opp.source_url} label="Fonte originale" />
              <ExtLink href={opp.google_maps_url} label="Google Maps" />
              <ExtLink href={opp.google_earth_url} label="Google Earth" />
              {opp.latitude && opp.longitude && (
                <ExtLink
                  href={`https://www.google.com/maps?q=${opp.latitude},${opp.longitude}`}
                  label={`Coord. ${opp.latitude}, ${opp.longitude}`}
                />
              )}
              {!opp.source_url && !opp.google_maps_url && !opp.google_earth_url && !opp.latitude && (
                <p className="text-sm text-muted-foreground">Nessun link disponibile.</p>
              )}
            </div>
          </Card>

          <Card title="Prossima azione">
            <Info label="Azione" value={opp.next_action} />
            <Info label="Data" value={opp.next_action_date ? new Date(opp.next_action_date).toLocaleDateString("it-IT") : null} />
          </Card>

          <Card title="Storico aggiornamenti">
            {!logs || logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna attività registrata.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {logs.map((l) => (
                  <li key={l.id} className="border-l-2 border-primary/40 pl-3">
                    <div className="text-foreground font-medium">{l.action_type}</div>
                    {l.description && <div className="text-muted-foreground text-xs">{l.description}</div>}
                    <div className="text-xs text-muted-foreground/70 tabular-nums">
                      {new Date(l.created_at).toLocaleString("it-IT")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="bg-muted/30 border border-dashed rounded-lg p-4 text-xs text-muted-foreground flex items-start gap-2">
            <Pencil className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Per modificare i dati dettagliati dell'immobile, usa la pagina di inserimento o estendi qui il form in una prossima iterazione.</span>
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-lg">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>;
}
function Info({ label, value, suffix = "" }: { label: string; value: unknown; suffix?: string }) {
  const display = value === null || value === undefined || value === "" ? "—" : `${value}${suffix}`;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{display}</div>
    </div>
  );
}
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
function SelectInline({ value, options, onChange }: { value: string; options: ReadonlyArray<{ value: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 bg-background border rounded-md text-sm"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function ExtLink({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 px-3 py-2 bg-background border rounded-md text-sm hover:bg-accent">
      <span className="truncate">{label}</span>
      <ExternalLink className="w-4 h-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

type OppRow = {
  target_covered_sqm?: number | null;
  target_covered_sqm_max?: number | null;
  target_yard_sqm?: number | null;
  target_internal_height?: number | null;
  measured_covered_sqm?: number | null;
  measured_yard_sqm?: number | null;
  measured_length?: number | null;
  measured_width?: number | null;
  measurement_source?: string | null;
  measurement_confidence?: string | null;
  measurement_notes?: string | null;
  compatibility_score?: number | null;
  compatibility_status?: string | null;
  missing_data?: { missing?: string[]; warnings?: string[] } | null;
  suggested_next_action?: string | null;
  last_measured_at?: string | null;
};

function MeasurementCard({ opp }: { opp: OppRow }) {
  const diffCovered =
    opp.target_covered_sqm != null && opp.measured_covered_sqm != null
      ? opp.measured_covered_sqm - opp.target_covered_sqm
      : null;
  const diffYard =
    opp.target_yard_sqm != null && opp.measured_yard_sqm != null
      ? opp.measured_yard_sqm - opp.target_yard_sqm
      : null;
  const missing = Array.isArray(opp.missing_data?.missing) ? opp.missing_data!.missing! : [];
  const warnings = Array.isArray(opp.missing_data?.warnings) ? opp.missing_data!.warnings! : [];

  return (
    <div className="bg-card border rounded-lg">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary" />
          Misurazione e compatibilità
        </h3>
        <CompatibilityBadge score={opp.compatibility_score} status={opp.compatibility_status} size="md" />
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MInfo label="Mq coperti richiesti" value={fmtOrMissing(opp.target_covered_sqm, { suffix: " m²" })} />
          <MInfo label="Mq coperti misurati" value={fmtOrMissing(opp.measured_covered_sqm, { suffix: " m²" })} />
          <MInfo label="Δ mq coperti" value={fmtDiff(diffCovered, "m²")} tone={diffTone(diffCovered)} />
          <MInfo label="Mq piazzale richiesti" value={fmtOrMissing(opp.target_yard_sqm, { suffix: " m²" })} />
          <MInfo label="Mq piazzale misurati" value={fmtOrMissing(opp.measured_yard_sqm, { suffix: " m²" })} />
          <MInfo label="Δ mq piazzale" value={fmtDiff(diffYard, "m²")} tone={diffTone(diffYard)} />
          <MInfo label="Lunghezza edificio" value={fmtOrMissing(opp.measured_length, { suffix: " m" })} />
          <MInfo label="Larghezza edificio" value={fmtOrMissing(opp.measured_width, { suffix: " m" })} />
          <MInfo
            label="Altezza interna"
            value={fmtOrMissing(opp.target_internal_height, { suffix: " m", missingLabel: "Da verificare" })}
          />
          <MInfo label="Fonte misura" value={MEASUREMENT_SOURCE_LABELS[opp.measurement_source ?? ""] ?? fmtOrMissing(opp.measurement_source)} />
          <MInfo label="Precisione misura" value={CONFIDENCE_LABELS[opp.measurement_confidence ?? ""] ?? fmtOrMissing(opp.measurement_confidence)} />
          <MInfo
            label="Ultima misurazione"
            value={opp.last_measured_at ? new Date(opp.last_measured_at).toLocaleString("it-IT") : "Non inserito"}
          />
        </div>

        {opp.measurement_notes && (
          <div className="p-3 bg-muted/40 rounded-md text-sm whitespace-pre-wrap">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Note misurazione</div>
            {opp.measurement_notes}
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Dati mancanti</div>
            <ul className="text-sm list-disc pl-5 space-y-0.5">
              {missing.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Da verificare</div>
            <ul className="text-sm list-disc pl-5 space-y-0.5 text-amber-600">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </div>
        )}

        {opp.suggested_next_action && (
          <div className="p-3 rounded-md border border-primary/30 bg-primary/5 text-sm">
            <div className="text-[11px] uppercase tracking-wide text-primary mb-1">Prossima azione suggerita</div>
            {opp.suggested_next_action}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Il punteggio di compatibilità indica la coerenza tecnica con i parametri di ricerca, non lo stato commerciale dell'immobile.
        </p>
      </div>
    </div>
  );
}

function MInfo({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | null }) {
  const cls = tone === "pos" ? "text-emerald-600" : tone === "neg" ? "text-red-600" : "text-foreground";
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-medium ${cls}`}>{value}</div>
    </div>
  );
}

function fmtDiff(d: number | null, unit: string): string {
  if (d == null) return "Non calcolabile";
  const sign = d >= 0 ? "+" : "";
  return `${sign}${Math.round(d).toLocaleString("it-IT")} ${unit}`;
}

function diffTone(d: number | null): "pos" | "neg" | null {
  if (d == null) return null;
  return d >= 0 ? "pos" : "neg";
}
