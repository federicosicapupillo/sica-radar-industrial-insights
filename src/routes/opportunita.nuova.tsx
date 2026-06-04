import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import {
  PROPERTY_TYPES,
  OPPORTUNITY_STATUS,
  PRIORITIES,
  ALREADY_FOR_SALE,
  PROPERTY_CONDITION,
  SOURCE_TYPES,
} from "@/lib/enums";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/opportunita/nuova")({
  component: NuovaPage,
});

type FormState = Record<string, string | boolean | null>;

const initial: FormState = {
  title: "",
  property_type: "capannone_industriale",
  opportunity_status: "da_verificare",
  priority: "media",
  region: "",
  province: "",
  city: "",
  address: "",
  latitude: "",
  longitude: "",
  covered_sqm: "",
  yard_sqm: "",
  internal_height: "",
  spans_count: "",
  has_offices: false,
  office_sqm: "",
  truck_access: false,
  loading_doors: "",
  has_crane: false,
  power_available: "",
  property_condition: "",
  intended_use: "",
  near_highway: false,
  near_port: false,
  near_industrial_area: false,
  already_for_sale: "non_verificato",
  asking_price: "",
  rent_price: "",
  source_type: "manuale",
  source_url: "",
  google_maps_url: "",
  google_earth_url: "",
  occupying_company: "",
  possible_owner: "",
  contact_name: "",
  phone: "",
  email: "",
  commercial_notes: "",
  next_action: "",
  next_action_date: "",
};

function NuovaPage() {
  const [f, setF] = useState<FormState>(initial);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const upd = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const m = useMutation({
    mutationFn: async () => {
      if (!f.title || String(f.title).trim().length === 0) throw new Error("Il titolo è obbligatorio");
      const payload: Record<string, unknown> = { ...f };
      // normalize numeric / empty
      const num = ["latitude","longitude","covered_sqm","yard_sqm","internal_height","spans_count","office_sqm","loading_doors","asking_price","rent_price"];
      for (const k of num) payload[k] = f[k] === "" || f[k] == null ? null : Number(f[k]);
      for (const k of Object.keys(payload)) {
        if (payload[k] === "") payload[k] = null;
      }
      const { data, error } = await supabase.from("opportunities").insert(payload as never).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Opportunità creata");
      qc.invalidateQueries({ queryKey: ["opps-all"] });
      qc.invalidateQueries({ queryKey: ["dashboard-opps"] });
      navigate({ to: "/opportunita/$id", params: { id: data!.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Nuova opportunità"
        subtitle="Inserisci i dati dell'immobile industriale."
        actions={
          <Link to="/opportunita" className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border bg-card hover:bg-accent">
            <ArrowLeft className="w-4 h-4" /> Indietro
          </Link>
        }
      />

      <form
        onSubmit={(e) => { e.preventDefault(); m.mutate(); }}
        className="p-4 md:p-8 space-y-6 max-w-5xl"
      >
        <Section title="Identificazione">
          <Field label="Titolo opportunità *" className="md:col-span-2">
            <Input value={f.title as string} onChange={(v) => upd("title", v)} required />
          </Field>
          <Field label="Tipologia immobile">
            <Select value={f.property_type as string} onChange={(v) => upd("property_type", v)} options={PROPERTY_TYPES} />
          </Field>
          <Field label="Stato opportunità">
            <Select value={f.opportunity_status as string} onChange={(v) => upd("opportunity_status", v)} options={OPPORTUNITY_STATUS} />
          </Field>
          <Field label="Priorità">
            <Select value={f.priority as string} onChange={(v) => upd("priority", v)} options={PRIORITIES} />
          </Field>
        </Section>

        <Section title="Ubicazione">
          <Field label="Regione"><Input value={f.region as string} onChange={(v) => upd("region", v)} /></Field>
          <Field label="Provincia"><Input value={f.province as string} onChange={(v) => upd("province", v)} /></Field>
          <Field label="Comune"><Input value={f.city as string} onChange={(v) => upd("city", v)} /></Field>
          <Field label="Indirizzo indicativo" className="md:col-span-2"><Input value={f.address as string} onChange={(v) => upd("address", v)} /></Field>
          <Field label="Latitudine"><Input type="number" step="any" value={f.latitude as string} onChange={(v) => upd("latitude", v)} /></Field>
          <Field label="Longitudine"><Input type="number" step="any" value={f.longitude as string} onChange={(v) => upd("longitude", v)} /></Field>
        </Section>

        <Section title="Dati tecnici">
          <Field label="Mq coperti"><Input type="number" value={f.covered_sqm as string} onChange={(v) => upd("covered_sqm", v)} /></Field>
          <Field label="Mq piazzale esterno"><Input type="number" value={f.yard_sqm as string} onChange={(v) => upd("yard_sqm", v)} /></Field>
          <Field label="Altezza interna (m)"><Input type="number" step="any" value={f.internal_height as string} onChange={(v) => upd("internal_height", v)} /></Field>
          <Field label="Numero campate"><Input type="number" value={f.spans_count as string} onChange={(v) => upd("spans_count", v)} /></Field>
          <Field label="Mq uffici"><Input type="number" value={f.office_sqm as string} onChange={(v) => upd("office_sqm", v)} /></Field>
          <Field label="Portoni carico/scarico"><Input type="number" value={f.loading_doors as string} onChange={(v) => upd("loading_doors", v)} /></Field>
          <Field label="Potenza elettrica disponibile"><Input value={f.power_available as string} onChange={(v) => upd("power_available", v)} placeholder="es. 150 kW" /></Field>
          <Field label="Stato immobile">
            <Select value={f.property_condition as string} onChange={(v) => upd("property_condition", v)} options={PROPERTY_CONDITION} placeholder="—" />
          </Field>
          <Field label="Destinazione d'uso"><Input value={f.intended_use as string} onChange={(v) => upd("intended_use", v)} /></Field>
          <div className="md:col-span-2 flex flex-wrap gap-4 pt-2">
            <Checkbox label="Presenza uffici" checked={!!f.has_offices} onChange={(v) => upd("has_offices", v)} />
            <Checkbox label="Accesso bilici" checked={!!f.truck_access} onChange={(v) => upd("truck_access", v)} />
            <Checkbox label="Carroponte" checked={!!f.has_crane} onChange={(v) => upd("has_crane", v)} />
            <Checkbox label="Vicinanza autostrada" checked={!!f.near_highway} onChange={(v) => upd("near_highway", v)} />
            <Checkbox label="Vicinanza porto" checked={!!f.near_port} onChange={(v) => upd("near_port", v)} />
            <Checkbox label="In zona industriale" checked={!!f.near_industrial_area} onChange={(v) => upd("near_industrial_area", v)} />
          </div>
        </Section>

        <Section title="Dati commerciali">
          <Field label="Immobile già in vendita?">
            <Select value={f.already_for_sale as string} onChange={(v) => upd("already_for_sale", v)} options={ALREADY_FOR_SALE} />
          </Field>
          <Field label="Prezzo richiesto (€)"><Input type="number" value={f.asking_price as string} onChange={(v) => upd("asking_price", v)} /></Field>
          <Field label="Canone affitto (€/mese)"><Input type="number" value={f.rent_price as string} onChange={(v) => upd("rent_price", v)} /></Field>
        </Section>

        <Section title="Fonte e link">
          <Field label="Fonte informazione">
            <Select value={f.source_type as string} onChange={(v) => upd("source_type", v)} options={SOURCE_TYPES} />
          </Field>
          <Field label="Link fonte esterna" className="md:col-span-2"><Input value={f.source_url as string} onChange={(v) => upd("source_url", v)} placeholder="https://…" /></Field>
          <Field label="Link Google Maps" className="md:col-span-2"><Input value={f.google_maps_url as string} onChange={(v) => upd("google_maps_url", v)} placeholder="https://maps.google.com/…" /></Field>
          <Field label="Link Google Earth" className="md:col-span-2"><Input value={f.google_earth_url as string} onChange={(v) => upd("google_earth_url", v)} /></Field>
        </Section>

        <Section title="Contatti e proprietà">
          <Field label="Azienda occupante"><Input value={f.occupying_company as string} onChange={(v) => upd("occupying_company", v)} /></Field>
          <Field label="Possibile proprietà"><Input value={f.possible_owner as string} onChange={(v) => upd("possible_owner", v)} /></Field>
          <Field label="Nome contatto"><Input value={f.contact_name as string} onChange={(v) => upd("contact_name", v)} /></Field>
          <Field label="Telefono"><Input value={f.phone as string} onChange={(v) => upd("phone", v)} /></Field>
          <Field label="Email" className="md:col-span-2"><Input type="email" value={f.email as string} onChange={(v) => upd("email", v)} /></Field>
        </Section>

        <Section title="Note e prossima azione">
          <Field label="Note commerciali" className="md:col-span-2">
            <Textarea value={f.commercial_notes as string} onChange={(v) => upd("commercial_notes", v)} />
          </Field>
          <Field label="Prossima azione"><Input value={f.next_action as string} onChange={(v) => upd("next_action", v)} placeholder="es. Chiamare proprietà" /></Field>
          <Field label="Data prossima azione"><Input type="date" value={f.next_action_date as string} onChange={(v) => upd("next_action_date", v)} /></Field>
        </Section>

        <div className="sticky bottom-0 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-background border-t flex items-center justify-end gap-3">
          <Link to="/opportunita" className="px-4 py-2 rounded-md border text-sm hover:bg-accent">Annulla</Link>
          <button
            type="submit"
            disabled={m.isPending}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {m.isPending ? "Salvataggio…" : "Salva opportunità"}
          </button>
        </div>
      </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-lg">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block " + className}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { onChange: (v: string) => void; value: string }) {
  const { onChange, ...rest } = props;
  return (
    <input
      {...rest}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function Textarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function Select({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: ReadonlyArray<{ value: string; label: string }>; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
      />
      <span>{label}</span>
    </label>
  );
}
