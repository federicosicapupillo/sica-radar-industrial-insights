import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  OPPORTUNITY_STATUS,
  PRIORITIES,
  PROPERTY_TYPES,
  labelOf,
  toneOf,
} from "@/lib/enums";
import { isFromMisuratore, compatStatusFromScore } from "@/lib/compatibility";
import { CompatibilityBadge, MisuratoreTag } from "@/components/CompatibilityBadge";
import {
  Building2,
  PlusCircle,
  Users,
  Map,
  BarChart3,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Archive,
  Phone,
  PhoneCall,
  Clock,
  Ruler,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-opps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id,title,city,province,property_type,opportunity_status,priority,updated_at,created_at,measurement_source,compatibility_score,compatibility_status,last_measured_at,occupant_company_name,occupant_phone,occupant_contact_status,last_call_date,call_outcome,is_owner_confirmed,is_tenant_confirmed,indicated_owner_name,next_action,next_action_date")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const opps = data ?? [];
  const count = (status: string) => opps.filter((o) => o.opportunity_status === status).length;
  const occCount = (s: string) => opps.filter((o) => (o.occupant_contact_status ?? "da_chiamare") === s).length;
  const callsDone = opps.filter((o) => !!o.last_call_date).length;
  const ownersIdentified = opps.filter((o) => o.is_owner_confirmed === true || !!o.indicated_owner_name).length;
  const ownersToIdentify = opps.filter((o) => (o.occupant_contact_status ?? "") === "proprieta_non_indicata" || o.opportunity_status === "proprieta_da_identificare").length;
  const today = new Date().toISOString().slice(0, 10);
  const callbacksScheduled = opps.filter((o) => o.next_action_date && String(o.next_action_date) >= today).length;
  const potentiallyAcquirable = opps.filter((o) => o.priority === "alta" && ["interessante", "contatto_trovato"].includes(o.opportunity_status ?? "")).length;

  const stats = [
    { label: "Totale opportunità", value: opps.length, icon: Building2, tone: "default" },
    { label: "Da chiamare", value: occCount("da_chiamare"), icon: Phone, tone: "warning" },
    { label: "Chiamate effettuate", value: callsDone, icon: PhoneCall, tone: "info" },
    { label: "Proprietà identificate", value: ownersIdentified, icon: CheckCircle2, tone: "success" },
    { label: "Proprietà da identificare", value: ownersToIdentify, icon: AlertCircle, tone: "warning" },
    { label: "Richiamate programmate", value: callbacksScheduled, icon: Clock, tone: "info" },
    { label: "Potenzialmente acquisibili", value: potentiallyAcquirable, icon: TrendingUp, tone: "success" },
    { label: "In trattativa", value: count("in_trattativa"), icon: CheckCircle2, tone: "success" },
  ];

  const quickActions = [
    { to: "/opportunita/nuova", label: "Nuova opportunità", icon: PlusCircle, primary: true },
    { to: "/opportunita", label: "Ricerca immobili", icon: Search },
    { to: "/contatti", label: "Contatti", icon: Users },
    { to: "/mappa", label: "Mappa opportunità", icon: Map },
    { to: "/report", label: "Report", icon: BarChart3 },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Panoramica operativa delle opportunità immobiliari industriali."
        actions={
          <Link
            to="/opportunita/nuova"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-95"
          >
            <PlusCircle className="w-4 h-4" />
            Nuova opportunità
          </Link>
        }
      />

      <div className="p-4 md:p-8 space-y-8">
        {/* KPI */}
        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</span>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-semibold tabular-nums text-foreground">{s.value}</div>
              </div>
            );
          })}
        </section>

        {/* Misuratore stats */}
        <MisuratoreCard opps={opps} />

        {/* Azioni rapide */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Azioni rapide
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to as never}
                  className={
                    "group flex items-center gap-3 p-4 rounded-lg border transition-colors " +
                    (a.primary
                      ? "bg-primary text-primary-foreground border-primary hover:opacity-95"
                      : "bg-card hover:bg-accent hover:text-accent-foreground")
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Ultime opportunità */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ultime opportunità inserite
            </h2>
            <Link to="/opportunita" className="text-sm text-primary hover:underline">
              Vedi tutte →
            </Link>
          </div>
          <div className="bg-card border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Caricamento…</div>
            ) : opps.length === 0 ? (
              <div className="p-10 text-center">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-foreground font-medium">Nessuna opportunità ancora</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Inserisci la prima opportunità immobiliare per iniziare.
                </p>
                <Link
                  to="/opportunita/nuova"
                  className="inline-flex items-center gap-2 mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
                >
                  <PlusCircle className="w-4 h-4" />
                  Nuova opportunità
                </Link>
              </div>
            ) : (
              <ul className="divide-y">
                {opps.slice(0, 8).map((o) => (
                  <li key={o.id}>
                    <Link
                      to="/opportunita/$id"
                      params={{ id: o.id }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{o.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[o.city, o.province].filter(Boolean).join(", ") || "Località non indicata"}
                          {o.property_type ? " · " + labelOf(PROPERTY_TYPES, o.property_type) : ""}
                        </div>
                      </div>
                      {isFromMisuratore(o) && <MisuratoreTag />}
                      {(isFromMisuratore(o) || o.compatibility_score != null) && (
                        <CompatibilityBadge score={o.compatibility_score} status={o.compatibility_status} showLabel={false} />
                      )}
                      <StatusBadge
                        label={labelOf(OPPORTUNITY_STATUS, o.opportunity_status)}
                        tone={toneOf(OPPORTUNITY_STATUS, o.opportunity_status)}
                      />
                      <StatusBadge
                        label={labelOf(PRIORITIES, o.priority)}
                        tone={toneOf(PRIORITIES, o.priority)}
                      />
                      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                        <Clock className="w-3 h-3" />
                        {new Date(o.created_at).toLocaleDateString("it-IT")}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

type DashOpp = {
  id: string;
  measurement_source?: string | null;
  compatibility_score?: number | null;
  compatibility_status?: string | null;
  last_measured_at?: string | null;
};

function MisuratoreCard({ opps }: { opps: DashOpp[] }) {
  const mis = opps.filter((o) => isFromMisuratore(o));
  if (mis.length === 0) {
    return (
      <section className="bg-card border rounded-lg p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-md bg-primary/10 text-primary grid place-items-center">
          <Ruler className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Opportunità misurate</div>
          <p className="text-xs text-muted-foreground">Nessuna opportunità ancora creata dal Misuratore capannoni.</p>
        </div>
        <Link to="/misuratore" className="text-sm text-primary hover:underline">Apri Misuratore →</Link>
      </section>
    );
  }
  const scored = mis.filter((o) => o.compatibility_score != null);
  const avg = scored.length > 0
    ? Math.round(scored.reduce((a, o) => a + (o.compatibility_score ?? 0), 0) / scored.length)
    : null;
  const compat = mis.filter((o) => {
    const s = (o.compatibility_status as string | null) ?? compatStatusFromScore(o.compatibility_score ?? null);
    return s === "compatibile";
  }).length;
  const verify = mis.filter((o) => {
    const s = (o.compatibility_status as string | null) ?? compatStatusFromScore(o.compatibility_score ?? null);
    return s === "da_verificare";
  }).length;

  return (
    <section className="bg-card border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">Opportunità misurate</h2>
        </div>
        <Link to="/misuratore" className="text-xs text-primary hover:underline">Nuova misurazione →</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Totali" value={String(mis.length)} />
        <MiniStat label="Media compatibilità" value={avg != null ? `${avg}%` : "—"} />
        <MiniStat label="Compatibili" value={String(compat)} tone="pos" />
        <MiniStat label="Da verificare" value={String(verify)} tone="neutral" />
      </div>
    </section>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neutral" }) {
  const cls = tone === "pos" ? "text-emerald-600" : "text-foreground";
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
