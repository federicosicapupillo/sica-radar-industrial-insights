import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  OPPORTUNITY_STATUS,
  PRIORITIES,
  PROPERTY_TYPES,
  ALREADY_FOR_SALE,
  labelOf,
  toneOf,
} from "@/lib/enums";
import { PlusCircle, Search, Filter, X } from "lucide-react";

export const Route = createFileRoute("/opportunita/")({
  component: ListPage,
});

type Filters = {
  q: string;
  province: string;
  city: string;
  property_type: string;
  opportunity_status: string;
  priority: string;
  already_for_sale: string;
  mq_min: string;
  mq_max: string;
  height_min: string;
  truck_access: string;
  has_yard: string;
};

const emptyFilters: Filters = {
  q: "",
  province: "",
  city: "",
  property_type: "",
  opportunity_status: "",
  priority: "",
  already_for_sale: "",
  mq_min: "",
  mq_max: "",
  height_min: "",
  truck_access: "",
  has_yard: "",
};

function ListPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["opps-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    let r = data ?? [];
    const q = filters.q.trim().toLowerCase();
    if (q) {
      r = r.filter((o) =>
        [o.title, o.city, o.province, o.address, o.occupying_company, o.possible_owner]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    if (filters.province) r = r.filter((o) => o.province?.toLowerCase().includes(filters.province.toLowerCase()));
    if (filters.city) r = r.filter((o) => o.city?.toLowerCase().includes(filters.city.toLowerCase()));
    if (filters.property_type) r = r.filter((o) => o.property_type === filters.property_type);
    if (filters.opportunity_status) r = r.filter((o) => o.opportunity_status === filters.opportunity_status);
    if (filters.priority) r = r.filter((o) => o.priority === filters.priority);
    if (filters.already_for_sale) r = r.filter((o) => o.already_for_sale === filters.already_for_sale);
    if (filters.mq_min) r = r.filter((o) => (o.covered_sqm ?? 0) >= Number(filters.mq_min));
    if (filters.mq_max) r = r.filter((o) => (o.covered_sqm ?? 0) <= Number(filters.mq_max));
    if (filters.height_min) r = r.filter((o) => (o.internal_height ?? 0) >= Number(filters.height_min));
    if (filters.truck_access === "si") r = r.filter((o) => o.truck_access === true);
    if (filters.truck_access === "no") r = r.filter((o) => o.truck_access === false);
    if (filters.has_yard === "si") r = r.filter((o) => (o.yard_sqm ?? 0) > 0);
    return r;
  }, [data, filters]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Opportunità immobiliari"
        subtitle={`${rows.length} ${rows.length === 1 ? "opportunità" : "opportunità"} ${activeCount ? "(filtrate)" : ""}`}
        actions={
          <>
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 border bg-card text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent"
            >
              <Filter className="w-4 h-4" />
              Filtri {activeCount > 0 && <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">{activeCount}</span>}
            </button>
            <Link
              to="/opportunita/nuova"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
            >
              <PlusCircle className="w-4 h-4" />
              Nuova
            </Link>
          </>
        }
      />

      <div className="p-4 md:p-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Cerca per titolo, città, provincia, azienda, proprietà…"
            className="w-full pl-9 pr-3 py-2.5 bg-card border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {open && (
          <div className="bg-card border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <FilterInput label="Provincia" value={filters.province} onChange={(v) => setFilters({ ...filters, province: v })} />
            <FilterInput label="Comune" value={filters.city} onChange={(v) => setFilters({ ...filters, city: v })} />
            <FilterSelect label="Tipologia" value={filters.property_type} options={PROPERTY_TYPES} onChange={(v) => setFilters({ ...filters, property_type: v })} />
            <FilterSelect label="Stato" value={filters.opportunity_status} options={OPPORTUNITY_STATUS} onChange={(v) => setFilters({ ...filters, opportunity_status: v })} />
            <FilterSelect label="Priorità" value={filters.priority} options={PRIORITIES} onChange={(v) => setFilters({ ...filters, priority: v })} />
            <FilterSelect label="Già in vendita" value={filters.already_for_sale} options={ALREADY_FOR_SALE} onChange={(v) => setFilters({ ...filters, already_for_sale: v })} />
            <FilterInput label="Mq min" type="number" value={filters.mq_min} onChange={(v) => setFilters({ ...filters, mq_min: v })} />
            <FilterInput label="Mq max" type="number" value={filters.mq_max} onChange={(v) => setFilters({ ...filters, mq_max: v })} />
            <FilterInput label="Altezza min (m)" type="number" value={filters.height_min} onChange={(v) => setFilters({ ...filters, height_min: v })} />
            <FilterSelect label="Accesso bilici" value={filters.truck_access} options={[{ value: "si", label: "Sì" }, { value: "no", label: "No" }]} onChange={(v) => setFilters({ ...filters, truck_access: v })} />
            <FilterSelect label="Piazzale esterno" value={filters.has_yard} options={[{ value: "si", label: "Presente" }]} onChange={(v) => setFilters({ ...filters, has_yard: v })} />
            <div className="flex items-end">
              <button
                onClick={() => setFilters(emptyFilters)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2"
              >
                <X className="w-4 h-4" /> Azzera filtri
              </button>
            </div>
          </div>
        )}

        {/* Desktop table / Mobile cards */}
        {isLoading ? (
          <div className="bg-card border rounded-lg p-10 text-center text-muted-foreground text-sm">Caricamento…</div>
        ) : rows.length === 0 ? (
          <div className="bg-card border rounded-lg p-10 text-center">
            <p className="text-foreground font-medium">Nessuna opportunità trovata</p>
            <p className="text-sm text-muted-foreground mt-1">Modifica i filtri o crea una nuova opportunità.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block bg-card border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Immobile</th>
                    <th className="text-left px-4 py-3 font-medium">Località</th>
                    <th className="text-left px-4 py-3 font-medium">Tipologia</th>
                    <th className="text-right px-4 py-3 font-medium">Mq coperti</th>
                    <th className="text-right px-4 py-3 font-medium">Altezza</th>
                    <th className="text-center px-4 py-3 font-medium">Bilici</th>
                    <th className="text-left px-4 py-3 font-medium">Stato</th>
                    <th className="text-left px-4 py-3 font-medium">Priorità</th>
                    <th className="text-right px-4 py-3 font-medium">Aggiornato</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((o) => (
                    <tr key={o.id} className="hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <Link to="/opportunita/$id" params={{ id: o.id }} className="font-medium text-foreground hover:text-primary">
                          {o.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{[o.city, o.province].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{labelOf(PROPERTY_TYPES, o.property_type)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.covered_sqm ? `${o.covered_sqm}` : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.internal_height ? `${o.internal_height} m` : "—"}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{o.truck_access === true ? "Sì" : o.truck_access === false ? "No" : "—"}</td>
                      <td className="px-4 py-3"><StatusBadge label={labelOf(OPPORTUNITY_STATUS, o.opportunity_status)} tone={toneOf(OPPORTUNITY_STATUS, o.opportunity_status)} /></td>
                      <td className="px-4 py-3"><StatusBadge label={labelOf(PRIORITIES, o.priority)} tone={toneOf(PRIORITIES, o.priority)} /></td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                        {new Date(o.updated_at).toLocaleDateString("it-IT")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden grid gap-3">
              {rows.map((o) => (
                <Link key={o.id} to="/opportunita/$id" params={{ id: o.id }} className="bg-card border rounded-lg p-4 hover:bg-accent/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{o.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[o.city, o.province].filter(Boolean).join(", ") || "—"}
                      </div>
                    </div>
                    <StatusBadge label={labelOf(PRIORITIES, o.priority)} tone={toneOf(PRIORITIES, o.priority)} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{labelOf(PROPERTY_TYPES, o.property_type)}</span>
                    {o.covered_sqm ? <span>· {o.covered_sqm} m²</span> : null}
                    {o.internal_height ? <span>· h {o.internal_height} m</span> : null}
                    {o.truck_access ? <span>· bilici</span> : null}
                  </div>
                  <div className="mt-3">
                    <StatusBadge label={labelOf(OPPORTUNITY_STATUS, o.opportunity_status)} tone={toneOf(OPPORTUNITY_STATUS, o.opportunity_status)} />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function FilterInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Tutti</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
