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
        .select("id,title,city,province,property_type,opportunity_status,priority,updated_at,created_at,measurement_source,compatibility_score,compatibility_status,last_measured_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const opps = data ?? [];
  const count = (status: string) => opps.filter((o) => o.opportunity_status === status).length;

  const stats = [
    { label: "Totale opportunità", value: opps.length, icon: Building2, tone: "default" },
    { label: "Interessanti", value: count("interessante"), icon: TrendingUp, tone: "info" },
    { label: "Da verificare", value: count("da_verificare"), icon: AlertCircle, tone: "warning" },
    { label: "Contatto trovato", value: count("contatto_trovato"), icon: Phone, tone: "info" },
    { label: "In trattativa", value: count("in_trattativa"), icon: CheckCircle2, tone: "success" },
    { label: "Archiviate", value: count("archiviato"), icon: Archive, tone: "muted" },
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
