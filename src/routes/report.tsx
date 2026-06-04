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
import { AlertTriangle, PhoneOff, Star } from "lucide-react";

export const Route = createFileRoute("/report")({
  component: ReportPage,
});

function ReportPage() {
  const { data: opps, isLoading } = useQuery({
    queryKey: ["opps-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = opps ?? [];
  const groupCount = <T extends string | null | undefined>(getter: (o: (typeof list)[number]) => T) => {
    const m = new Map<string, number>();
    for (const o of list) {
      const k = String(getter(o) ?? "—");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };

  const byStatus = groupCount((o) => o.opportunity_status);
  const byProvince = groupCount((o) => o.province);
  const byType = groupCount((o) => o.property_type);
  const byPriority = groupCount((o) => o.priority);

  const missingContact = list.filter((o) => !o.contact_name && !o.phone && !o.email && o.opportunity_status !== "archiviato");
  const today = new Date().toISOString().slice(0, 10);
  const overdue = list.filter((o) => o.next_action_date && o.next_action_date < today && o.opportunity_status !== "archiviato");
  const toRecall = list.filter((o) => o.opportunity_status === "interessante" || o.opportunity_status === "contatto_trovato");

  return (
    <>
      <PageHeader title="Report" subtitle="Visione d'insieme sull'attività di acquisizione." />

      <div className="p-4 md:p-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 text-center text-muted-foreground">Caricamento…</div>
        ) : (
          <>
            <ReportCard title="Per stato" items={byStatus.map(([k, v]) => ({
              label: labelOf(OPPORTUNITY_STATUS, k), value: v, tone: toneOf(OPPORTUNITY_STATUS, k),
            }))} />
            <ReportCard title="Per provincia" items={byProvince.map(([k, v]) => ({ label: k, value: v }))} />
            <ReportCard title="Per tipologia" items={byType.map(([k, v]) => ({ label: labelOf(PROPERTY_TYPES, k), value: v }))} />
            <ReportCard title="Per priorità" items={byPriority.map(([k, v]) => ({
              label: labelOf(PRIORITIES, k), value: v, tone: toneOf(PRIORITIES, k),
            }))} />

            <ActionList title="Immobili senza contatto" icon={PhoneOff} items={missingContact} />
            <ActionList title="Prossime azioni scadute" icon={AlertTriangle} items={overdue} />
            <ActionList title="Interessanti da richiamare" icon={Star} items={toRecall} className="xl:col-span-2" />
          </>
        )}
      </div>
    </>
  );
}

function ReportCard({ title, items }: { title: string; items: { label: string; value: number; tone?: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="bg-card border rounded-lg">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-4 space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">Nessun dato.</p> : items.map((i) => (
          <div key={i.label} className="flex items-center gap-3">
            <div className="w-40 truncate text-sm">{i.label}</div>
            <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${(i.value / max) * 100}%` }} />
            </div>
            <div className="w-10 text-right text-sm tabular-nums font-medium">{i.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionList({
  title, icon: Icon, items, className = "",
}: {
  title: string;
  icon: typeof PhoneOff;
  items: { id: string; title: string; city?: string | null; province?: string | null; opportunity_status?: string | null; priority?: string | null }[];
  className?: string;
}) {
  return (
    <div className={"bg-card border rounded-lg " + className}>
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">Nessun elemento.</div>
      ) : (
        <ul className="divide-y max-h-72 overflow-auto">
          {items.slice(0, 30).map((o) => (
            <li key={o.id}>
              <Link to="/opportunita/$id" params={{ id: o.id }} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent/30">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{o.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{[o.city, o.province].filter(Boolean).join(", ") || "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={labelOf(PRIORITIES, o.priority)} tone={toneOf(PRIORITIES, o.priority)} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
