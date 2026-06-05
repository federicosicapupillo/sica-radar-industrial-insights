import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CompatibilityBadge, MisuratoreTag } from "@/components/CompatibilityBadge";
import { isFromMisuratore } from "@/lib/compatibility";
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

type SortKey = "recent" | "compat_desc" | "compat_asc";

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
  only_misuratore: boolean;
  only_da_verificare: boolean;
  measurement_complete: string;
  has_geo_file: boolean;
  has_maps_link: boolean;
  has_earth_link: boolean;
  occupant_status: string;
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
  only_misuratore: false,
  only_da_verificare: false,
  measurement_complete: "",
  has_geo_file: false,
  has_maps_link: false,
  has_earth_link: false,
  occupant_status: "",
};


function ListPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<SortKey>("recent");
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
    if (filters.only_misuratore) r = r.filter((o) => isFromMisuratore(o));
    if (filters.only_da_verificare) r = r.filter((o) => o.opportunity_status === "da_verificare" || o.compatibility_status === "da_verificare");
    if (filters.measurement_complete === "complete") {
      r = r.filter((o) => o.measured_covered_sqm != null && (!o.target_yard_sqm || o.measured_yard_sqm != null));
    }
    if (filters.measurement_complete === "incomplete") {
      r = r.filter((o) => isFromMisuratore(o) && (o.measured_covered_sqm == null || (o.target_yard_sqm && o.measured_yard_sqm == null)));
    }
    if (filters.measurement_complete === "missing_data") {
      r = r.filter((o) => {
        const md = o.missing_data as { missing?: unknown[] } | null;
        return Array.isArray(md?.missing) && md!.missing!.length > 0;
      });
    }
    if (filters.has_geo_file) r = r.filter((o) => !!o.uploaded_file_url || !!o.geojson_data);
    if (filters.has_maps_link) r = r.filter((o) => !!o.google_maps_url);
    if (filters.has_earth_link) r = r.filter((o) => !!o.google_earth_url);


    if (sort === "compat_desc" || sort === "compat_asc") {
      const dir = sort === "compat_desc" ? -1 : 1;
      r = [...r].sort((a, b) => {
        const sa = a.compatibility_score ?? -1;
        const sb = b.compatibility_score ?? -1;
        return (sa - sb) * dir;
      });
    }
    return r;
  }, [data, filters, sort]);

  const activeCount =
    Object.entries(filters).filter(([, v]) => (typeof v === "boolean" ? v : !!v)).length;

  return (
    <>
      <PageHeader
        title="Opportunità immobiliari"
        subtitle={`${rows.length} opportunità ${activeCount ? "(filtrate)" : ""}`}
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
        {/* Search + Sort */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Cerca per titolo, città, provincia, azienda, proprietà…"
              className="w-full pl-9 pr-3 py-2.5 bg-card border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-2.5 bg-card border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="recent">Ordina: più recenti</option>
            <option value="compat_desc">Compatibilità ↓</option>
            <option value="compat_asc">Compatibilità ↑</option>
          </select>
        </div>

        {/* Quick toggles */}
        <div className="flex flex-wrap gap-2">
          <Toggle
            active={filters.only_misuratore}
            onClick={() => setFilters({ ...filters, only_misuratore: !filters.only_misuratore })}
            label="Solo Misuratore"
          />
          <Toggle
            active={filters.only_da_verificare}
            onClick={() => setFilters({ ...filters, only_da_verificare: !filters.only_da_verificare })}
            label="Solo da verificare"
          />
          <Toggle
            active={filters.measurement_complete === "complete"}
            onClick={() => setFilters({ ...filters, measurement_complete: filters.measurement_complete === "complete" ? "" : "complete" })}
            label="Misurazione completa"
          />
          <Toggle
            active={filters.measurement_complete === "incomplete"}
            onClick={() => setFilters({ ...filters, measurement_complete: filters.measurement_complete === "incomplete" ? "" : "incomplete" })}
            label="Misurazione incompleta"
          />
          <Toggle
            active={filters.measurement_complete === "missing_data"}
            onClick={() => setFilters({ ...filters, measurement_complete: filters.measurement_complete === "missing_data" ? "" : "missing_data" })}
            label="Con dati mancanti"
          />
          <Toggle
            active={filters.has_geo_file}
            onClick={() => setFilters({ ...filters, has_geo_file: !filters.has_geo_file })}
            label="Con file geospaziale"
          />
          <Toggle
            active={filters.has_maps_link}
            onClick={() => setFilters({ ...filters, has_maps_link: !filters.has_maps_link })}
            label="Con link Google Maps"
          />
          <Toggle
            active={filters.has_earth_link}
            onClick={() => setFilters({ ...filters, has_earth_link: !filters.has_earth_link })}
            label="Con link Google Earth"
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

        {isLoading ? (
          <div className="bg-card border rounded-lg p-10 text-center text-muted-foreground text-sm">Caricamento…</div>
        ) : rows.length === 0 ? (
          <div className="bg-card border rounded-lg p-10 text-center">
            <p className="text-foreground font-medium">Nessuna opportunità trovata</p>
            <p className="text-sm text-muted-foreground mt-1">Modifica i filtri o crea una nuova opportunità.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
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
                    <th className="text-left px-4 py-3 font-medium">Compatibilità</th>
                    <th className="text-left px-4 py-3 font-medium">Stato</th>
                    <th className="text-left px-4 py-3 font-medium">Priorità</th>
                    <th className="text-right px-4 py-3 font-medium">Aggiornato</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((o) => {
                    const fromMis = isFromMisuratore(o);
                    return (
                      <tr key={o.id} className="hover:bg-accent/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link to="/opportunita/$id" params={{ id: o.id }} className="font-medium text-foreground hover:text-primary">
                              {o.title}
                            </Link>
                            {fromMis && <MisuratoreTag />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{[o.city, o.province].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{labelOf(PROPERTY_TYPES, o.property_type)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{o.covered_sqm ? `${o.covered_sqm}` : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{o.internal_height ? `${o.internal_height} m` : "—"}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{o.truck_access === true ? "Sì" : o.truck_access === false ? "No" : "—"}</td>
                        <td className="px-4 py-3">
                          {fromMis || o.compatibility_score != null
                            ? <CompatibilityBadge score={o.compatibility_score} status={o.compatibility_status} showLabel={false} />
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge label={labelOf(OPPORTUNITY_STATUS, o.opportunity_status)} tone={toneOf(OPPORTUNITY_STATUS, o.opportunity_status)} /></td>
                        <td className="px-4 py-3"><StatusBadge label={labelOf(PRIORITIES, o.priority)} tone={toneOf(PRIORITIES, o.priority)} /></td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">
                          {new Date(o.updated_at).toLocaleDateString("it-IT")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden grid gap-3">
              {rows.map((o) => {
                const fromMis = isFromMisuratore(o);
                return (
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
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge label={labelOf(OPPORTUNITY_STATUS, o.opportunity_status)} tone={toneOf(OPPORTUNITY_STATUS, o.opportunity_status)} />
                      {fromMis && <MisuratoreTag />}
                      {(fromMis || o.compatibility_score != null) && (
                        <CompatibilityBadge score={o.compatibility_score} status={o.compatibility_status} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors " +
        (active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground hover:text-foreground hover:bg-accent")
      }
    >
      {label}
    </button>
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
