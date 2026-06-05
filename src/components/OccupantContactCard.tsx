import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Phone,
  Copy,
  Globe,
  Map as MapIcon,
  Mountain,
  PhoneCall,
  CalendarPlus,
  Search as SearchIcon,
  CheckCircle2,
  Save,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import {
  OCCUPANT_CONTACT_STATUS,
  OCCUPANT_CONTACT_SOURCE,
  OCCUPANT_CONTACT_CONFIDENCE,
  CALL_OUTCOMES,
  CALL_SCRIPT_TEXT,
  labelOf,
} from "@/lib/enums";

type OppRow = {
  id: string;
  title?: string | null;
  occupant_company_name?: string | null;
  occupant_sign_name?: string | null;
  occupant_phone?: string | null;
  occupant_email?: string | null;
  occupant_website?: string | null;
  occupant_reference_name?: string | null;
  occupant_reference_role?: string | null;
  occupant_contact_source?: string | null;
  occupant_contact_confidence?: string | null;
  occupant_contact_notes?: string | null;
  occupant_contact_status?: string | null;
  google_maps_url?: string | null;
  google_earth_url?: string | null;
  last_call_date?: string | null;
  call_outcome?: string | null;
  person_spoken_to?: string | null;
  person_role?: string | null;
  is_owner_confirmed?: boolean | null;
  is_tenant_confirmed?: boolean | null;
  owner_contact_provided?: boolean | null;
  indicated_owner_name?: string | null;
  indicated_owner_phone?: string | null;
  indicated_owner_email?: string | null;
  call_notes?: string | null;
};

export function OccupantContactCard({ opp }: { opp: OppRow }) {
  const qc = useQueryClient();
  const [showScript, setShowScript] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OppRow>(opp);
  const [logging, setLogging] = useState(false);

  const updateMut = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("opportunities").update(patch as never).eq("id", opp.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp", opp.id] });
      qc.invalidateQueries({ queryKey: ["opps-all"] });
      qc.invalidateQueries({ queryKey: ["dashboard-opps"] });
      qc.invalidateQueries({ queryKey: ["contact-attempts", opp.id] });
      toast.success("Aggiornato");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveOccupant = () => {
    updateMut.mutate({
      occupant_company_name: form.occupant_company_name || null,
      occupant_sign_name: form.occupant_sign_name || null,
      occupant_phone: form.occupant_phone || null,
      occupant_email: form.occupant_email || null,
      occupant_website: form.occupant_website || null,
      occupant_reference_name: form.occupant_reference_name || null,
      occupant_reference_role: form.occupant_reference_role || null,
      occupant_contact_source: form.occupant_contact_source || null,
      occupant_contact_confidence: form.occupant_contact_confidence || null,
      occupant_contact_notes: form.occupant_contact_notes || null,
    });
    setEditing(false);
  };

  const copyPhone = async () => {
    if (!opp.occupant_phone) return toast.error("Nessun telefono salvato");
    await navigator.clipboard.writeText(opp.occupant_phone);
    toast.success("Telefono copiato");
  };

  const websearchUrl = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const mapsUrl = opp.google_maps_url ||
    (opp.occupant_company_name ? `https://www.google.com/maps/search/${encodeURIComponent(opp.occupant_company_name)}` : null);
  const phoneHref = opp.occupant_phone ? `tel:${opp.occupant_phone.replace(/\s+/g, "")}` : null;

  return (
    <div className="bg-card border rounded-lg">
      <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-primary" />
          Azienda occupante / primo contatto
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={opp.occupant_contact_status || "da_chiamare"}
            onChange={(e) => updateMut.mutate({ occupant_contact_status: e.target.value })}
            className="px-2 py-1.5 bg-background border rounded-md text-xs"
          >
            {OCCUPANT_CONTACT_STATUS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <a
            href={phoneHref || "#"}
            onClick={(e) => { if (!phoneHref) { e.preventDefault(); toast.error("Inserisci un telefono"); } }}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-primary text-primary-foreground hover:opacity-90"
          >
            <Phone className="w-3.5 h-3.5" /> Chiama azienda
          </a>
          <button onClick={copyPhone} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent">
            <Copy className="w-3.5 h-3.5" /> Copia telefono
          </button>
          {opp.occupant_website && (
            <a href={ensureUrl(opp.occupant_website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent">
              <Globe className="w-3.5 h-3.5" /> Apri sito
            </a>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent">
              <MapIcon className="w-3.5 h-3.5" /> Google Maps
            </a>
          )}
          {opp.google_earth_url && (
            <a href={opp.google_earth_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent">
              <Mountain className="w-3.5 h-3.5" /> Google Earth
            </a>
          )}
          {opp.occupant_company_name && (
            <a href={websearchUrl(opp.occupant_company_name)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent">
              <SearchIcon className="w-3.5 h-3.5" /> Cerca su Google
            </a>
          )}
          <button
            onClick={() => setLogging((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent"
          >
            <CalendarPlus className="w-3.5 h-3.5" /> Registra esito chiamata
          </button>
          <button
            onClick={() => updateMut.mutate({ opportunity_status: "proprieta_da_identificare" })}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent"
          >
            Segna: proprietà da identificare
          </button>
          <button
            onClick={() => updateMut.mutate({ opportunity_status: "interessante", priority: "alta" })}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Potenzialmente acquisibile
          </button>
        </div>

        {/* Script chiamata */}
        <div className="border rounded-md bg-muted/30">
          <button
            type="button"
            onClick={() => setShowScript((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
          >
            <span>📞 Script chiamata occupante</span>
            {showScript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showScript && (
            <div className="px-3 pb-3 space-y-2">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-background p-3 rounded-md border">{CALL_SCRIPT_TEXT}</pre>
              <button
                onClick={() => { navigator.clipboard.writeText(CALL_SCRIPT_TEXT); toast.success("Script copiato"); }}
                className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Copy className="w-3 h-3" /> Copia script
              </button>
              <div className="text-xs text-muted-foreground">
                Possibili esiti: sono proprietari · affittuari + contatto · affittuari senza contatto · chiedono email · non interessati · richiamare.
              </div>
            </div>
          )}
        </div>

        {/* Occupant data */}
        {!editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Info label="Azienda occupante" value={opp.occupant_company_name} />
              <Info label="Insegna visibile" value={opp.occupant_sign_name} />
              <Info label="Telefono" value={opp.occupant_phone} />
              <Info label="Email" value={opp.occupant_email} />
              <Info label="Sito web" value={opp.occupant_website} />
              <Info label="Referente" value={opp.occupant_reference_name} />
              <Info label="Ruolo referente" value={opp.occupant_reference_role} />
              <Info label="Fonte contatto" value={labelOf(OCCUPANT_CONTACT_SOURCE, opp.occupant_contact_source)} />
              <Info label="Attendibilità" value={labelOf(OCCUPANT_CONTACT_CONFIDENCE, opp.occupant_contact_confidence)} />
            </div>
            {opp.occupant_contact_notes && (
              <div className="text-sm whitespace-pre-wrap p-3 bg-muted/40 rounded-md">{opp.occupant_contact_notes}</div>
            )}
            <button onClick={() => { setForm(opp); setEditing(true); }} className="text-xs text-primary hover:underline">
              ✏️ Modifica dati occupante
            </button>
          </div>
        ) : (
          <div className="space-y-3 border rounded-md p-3 bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nome azienda occupante"><input className={inp} value={form.occupant_company_name ?? ""} onChange={(e) => setForm({ ...form, occupant_company_name: e.target.value })} /></Field>
              <Field label="Insegna visibile"><input className={inp} value={form.occupant_sign_name ?? ""} onChange={(e) => setForm({ ...form, occupant_sign_name: e.target.value })} /></Field>
              <Field label="Telefono"><input className={inp} value={form.occupant_phone ?? ""} onChange={(e) => setForm({ ...form, occupant_phone: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className={inp} value={form.occupant_email ?? ""} onChange={(e) => setForm({ ...form, occupant_email: e.target.value })} /></Field>
              <Field label="Sito web"><input className={inp} value={form.occupant_website ?? ""} onChange={(e) => setForm({ ...form, occupant_website: e.target.value })} /></Field>
              <Field label="Referente conosciuto"><input className={inp} value={form.occupant_reference_name ?? ""} onChange={(e) => setForm({ ...form, occupant_reference_name: e.target.value })} /></Field>
              <Field label="Ruolo referente"><input className={inp} value={form.occupant_reference_role ?? ""} onChange={(e) => setForm({ ...form, occupant_reference_role: e.target.value })} /></Field>
              <Field label="Fonte contatto">
                <select className={inp} value={form.occupant_contact_source ?? ""} onChange={(e) => setForm({ ...form, occupant_contact_source: e.target.value })}>
                  <option value="">—</option>
                  {OCCUPANT_CONTACT_SOURCE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Attendibilità">
                <select className={inp} value={form.occupant_contact_confidence ?? ""} onChange={(e) => setForm({ ...form, occupant_contact_confidence: e.target.value })}>
                  <option value="">—</option>
                  {OCCUPANT_CONTACT_CONFIDENCE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Note contatto">
              <textarea rows={3} className={inp} value={form.occupant_contact_notes ?? ""} onChange={(e) => setForm({ ...form, occupant_contact_notes: e.target.value })} />
            </Field>
            <div className="flex gap-2">
              <button onClick={saveOccupant} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
                <Save className="w-4 h-4" /> Salva
              </button>
              <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 rounded-md border bg-background">Annulla</button>
            </div>
          </div>
        )}

        {/* Last call summary */}
        {(opp.last_call_date || opp.call_outcome) && (
          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Ultima chiamata</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Info label="Data" value={opp.last_call_date ? new Date(opp.last_call_date).toLocaleString("it-IT") : null} />
              <Info label="Esito" value={labelOf(CALL_OUTCOMES, opp.call_outcome)} />
              <Info label="Persona" value={opp.person_spoken_to} />
              <Info label="Ruolo" value={opp.person_role} />
              <Info label="Sono proprietari?" value={ynOrNull(opp.is_owner_confirmed)} />
              <Info label="Sono affittuari?" value={ynOrNull(opp.is_tenant_confirmed)} />
            </div>
            {(opp.indicated_owner_name || opp.indicated_owner_phone || opp.indicated_owner_email) && (
              <div className="mt-2 p-3 rounded-md border border-emerald-500/30 bg-emerald-500/5">
                <div className="text-[11px] uppercase tracking-wide text-emerald-700 mb-1">Contatto proprietà indicato</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <Info label="Nome" value={opp.indicated_owner_name} />
                  <Info label="Telefono" value={opp.indicated_owner_phone} />
                  <Info label="Email" value={opp.indicated_owner_email} />
                </div>
              </div>
            )}
            {opp.call_notes && <div className="mt-2 text-sm whitespace-pre-wrap p-3 bg-muted/40 rounded-md">{opp.call_notes}</div>}
          </div>
        )}

        {logging && <CallLogForm opp={opp} onDone={() => setLogging(false)} />}

        <CallHistory opportunityId={opp.id} />
      </div>
    </div>
  );
}

function ensureUrl(u: string) {
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

function ynOrNull(v?: boolean | null) {
  if (v === true) return "Sì";
  if (v === false) return "No";
  return null;
}

const inp = "w-full px-2 py-1.5 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || value === "" || value === "—" ? "—" : String(value);
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{display}</div>
    </div>
  );
}

// ---- Call log form ----

type CallForm = {
  contact_date: string;
  outcome: string;
  person_spoken_to: string;
  person_role: string;
  is_owner_confirmed: "" | "true" | "false";
  is_tenant_confirmed: "" | "true" | "false";
  owner_contact_provided: boolean;
  indicated_owner_name: string;
  indicated_owner_phone: string;
  indicated_owner_email: string;
  notes: string;
  next_action: string;
  next_action_date: string;
};

function CallLogForm({ opp, onDone }: { opp: OppRow; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<CallForm>({
    contact_date: new Date().toISOString().slice(0, 16),
    outcome: "",
    person_spoken_to: "",
    person_role: "",
    is_owner_confirmed: "",
    is_tenant_confirmed: "",
    owner_contact_provided: false,
    indicated_owner_name: "",
    indicated_owner_phone: "",
    indicated_owner_email: "",
    notes: "",
    next_action: "",
    next_action_date: "",
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const outcomeToStatus: Record<string, { occupant_contact_status: string; opportunity_status?: string }> = {
        sono_proprietari: { occupant_contact_status: "sono_proprietari", opportunity_status: "contatto_trovato" },
        affittuari_con_contatto: { occupant_contact_status: "proprieta_indicata", opportunity_status: "contatto_trovato" },
        affittuari_senza_contatto: { occupant_contact_status: "proprieta_non_indicata", opportunity_status: "proprieta_da_identificare" },
        inviare_email: { occupant_contact_status: "richiamare" },
        non_interessati: { occupant_contact_status: "non_interessati", opportunity_status: "non_interessato" },
        richiamare: { occupant_contact_status: "richiamare" },
        non_risponde: { occupant_contact_status: "non_risponde" },
        numero_errato: { occupant_contact_status: "numero_errato" },
      };
      const mapping = outcomeToStatus[f.outcome] ?? { occupant_contact_status: "chiamato" };
      const isOwner = f.is_owner_confirmed === "true" ? true : f.is_owner_confirmed === "false" ? false : null;
      const isTenant = f.is_tenant_confirmed === "true" ? true : f.is_tenant_confirmed === "false" ? false : null;

      const attempt = {
        opportunity_id: opp.id,
        contact_type: "telefono",
        contact_date: new Date(f.contact_date).toISOString(),
        contacted_company: opp.occupant_company_name,
        contacted_phone: opp.occupant_phone,
        person_spoken_to: f.person_spoken_to || null,
        person_role: f.person_role || null,
        outcome: f.outcome || null,
        is_owner_confirmed: isOwner,
        is_tenant_confirmed: isTenant,
        owner_contact_provided: f.owner_contact_provided,
        indicated_owner_name: f.indicated_owner_name || null,
        indicated_owner_phone: f.indicated_owner_phone || null,
        indicated_owner_email: f.indicated_owner_email || null,
        notes: f.notes || null,
        next_action: f.next_action || null,
        next_action_date: f.next_action_date || null,
      };
      const { error: e1 } = await supabase.from("contact_attempts").insert(attempt as never);
      if (e1) throw e1;

      const patch: Record<string, unknown> = {
        last_call_date: attempt.contact_date,
        call_outcome: f.outcome || null,
        person_spoken_to: f.person_spoken_to || null,
        person_role: f.person_role || null,
        is_owner_confirmed: isOwner,
        is_tenant_confirmed: isTenant,
        owner_contact_provided: f.owner_contact_provided,
        indicated_owner_name: f.indicated_owner_name || null,
        indicated_owner_phone: f.indicated_owner_phone || null,
        indicated_owner_email: f.indicated_owner_email || null,
        call_notes: f.notes || null,
        next_action: f.next_action || null,
        next_action_date: f.next_action_date || null,
        ...mapping,
      };
      const { error: e2 } = await supabase.from("opportunities").update(patch as never).eq("id", opp.id);
      if (e2) throw e2;

      await supabase.from("activity_logs").insert({
        opportunity_id: opp.id,
        action_type: "chiamata",
        description: `Esito: ${f.outcome || "—"}${f.person_spoken_to ? ` · ${f.person_spoken_to}` : ""}`,
      } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opp", opp.id] });
      qc.invalidateQueries({ queryKey: ["contact-attempts", opp.id] });
      qc.invalidateQueries({ queryKey: ["logs", opp.id] });
      qc.invalidateQueries({ queryKey: ["opps-all"] });
      qc.invalidateQueries({ queryKey: ["dashboard-opps"] });
      toast.success("Chiamata registrata");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="border rounded-md p-3 bg-muted/20 space-y-3">
      <h4 className="text-sm font-semibold">Esito chiamata</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Data e ora chiamata"><input type="datetime-local" className={inp} value={f.contact_date} onChange={(e) => setF({ ...f, contact_date: e.target.value })} /></Field>
        <Field label="Esito">
          <select className={inp} value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}>
            <option value="">—</option>
            {CALL_OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Persona con cui ho parlato"><input className={inp} value={f.person_spoken_to} onChange={(e) => setF({ ...f, person_spoken_to: e.target.value })} /></Field>
        <Field label="Ruolo persona"><input className={inp} value={f.person_role} onChange={(e) => setF({ ...f, person_role: e.target.value })} /></Field>
        <Field label="Sono proprietari?">
          <select className={inp} value={f.is_owner_confirmed} onChange={(e) => setF({ ...f, is_owner_confirmed: e.target.value as CallForm["is_owner_confirmed"] })}>
            <option value="">Non chiaro</option>
            <option value="true">Sì</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="Sono affittuari?">
          <select className={inp} value={f.is_tenant_confirmed} onChange={(e) => setF({ ...f, is_tenant_confirmed: e.target.value as CallForm["is_tenant_confirmed"] })}>
            <option value="">Non chiaro</option>
            <option value="true">Sì</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>

      <div className="border rounded-md p-3 bg-background space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.owner_contact_provided} onChange={(e) => setF({ ...f, owner_contact_provided: e.target.checked })} />
          Hanno indicato un contatto della proprietà
        </label>
        {f.owner_contact_provided && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Nome proprietario indicato"><input className={inp} value={f.indicated_owner_name} onChange={(e) => setF({ ...f, indicated_owner_name: e.target.value })} /></Field>
            <Field label="Telefono proprietario"><input className={inp} value={f.indicated_owner_phone} onChange={(e) => setF({ ...f, indicated_owner_phone: e.target.value })} /></Field>
            <Field label="Email proprietario"><input type="email" className={inp} value={f.indicated_owner_email} onChange={(e) => setF({ ...f, indicated_owner_email: e.target.value })} /></Field>
          </div>
        )}
      </div>

      <Field label="Note chiamata"><textarea rows={3} className={inp} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Prossima azione"><input className={inp} placeholder="Es. richiamare, inviare email, sopralluogo" value={f.next_action} onChange={(e) => setF({ ...f, next_action: e.target.value })} /></Field>
        <Field label="Data prossima azione"><input type="date" className={inp} value={f.next_action_date} onChange={(e) => setF({ ...f, next_action_date: e.target.value })} /></Field>
      </div>

      <div className="flex gap-2">
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
          <Save className="w-4 h-4" /> {saveMut.isPending ? "Salvataggio…" : "Salva chiamata"}
        </button>
        <button onClick={onDone} className="text-sm px-3 py-1.5 rounded-md border bg-background">Annulla</button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Nota: l'azienda occupante non viene mai trasformata automaticamente in proprietario. Il proprietario va verificato con documento o incarico.
      </p>
    </div>
  );
}

// ---- Call history ----

function CallHistory({ opportunityId }: { opportunityId: string }) {
  const { data } = useQuery({
    queryKey: ["contact-attempts", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_attempts")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("contact_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="border-t pt-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
        <History className="w-3.5 h-3.5" /> Storico contatti ({data.length})
      </div>
      <ul className="space-y-2">
        {data.map((c) => (
          <li key={c.id} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{labelOf(CALL_OUTCOMES, c.outcome) || "Contatto"}</span>
              {c.person_spoken_to && <span className="text-muted-foreground">· {c.person_spoken_to}{c.person_role ? ` (${c.person_role})` : ""}</span>}
              <span className="text-xs text-muted-foreground tabular-nums ml-auto">{new Date(c.contact_date).toLocaleString("it-IT")}</span>
            </div>
            {(c.is_owner_confirmed === true || c.is_tenant_confirmed === true) && (
              <div className="text-xs text-muted-foreground">
                {c.is_owner_confirmed === true && "Proprietari "}
                {c.is_tenant_confirmed === true && "Affittuari "}
              </div>
            )}
            {c.indicated_owner_name && (
              <div className="text-xs text-emerald-700">→ Proprietà indicata: {c.indicated_owner_name}{c.indicated_owner_phone ? ` · ${c.indicated_owner_phone}` : ""}</div>
            )}
            {c.notes && <div className="text-xs text-muted-foreground whitespace-pre-wrap">{c.notes}</div>}
            {c.next_action && (
              <div className="text-xs text-amber-700">⏭ {c.next_action}{c.next_action_date ? ` — ${new Date(c.next_action_date).toLocaleDateString("it-IT")}` : ""}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
