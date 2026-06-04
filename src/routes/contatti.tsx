import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CONTACT_STATUS, labelOf } from "@/lib/enums";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/contatti")({
  component: ContattiPage,
});

function ContattiPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", company: "", role: "", phone: "", email: "", status: "da_contattare", notes: "", opportunity_id: "",
  });

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, opportunities(id,title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: opps } = useQuery({
    queryKey: ["opps-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("id,title").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...form };
      for (const k of Object.keys(payload)) if (payload[k] === "") payload[k] = null;
      const { error } = await supabase.from("contacts").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contatto creato");
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setOpen(false);
      setForm({ first_name: "", last_name: "", company: "", role: "", phone: "", email: "", status: "da_contattare", notes: "", opportunity_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contatto eliminato");
    },
  });

  return (
    <>
      <PageHeader
        title="Contatti / CRM"
        subtitle="Persone collegate alle opportunità immobiliari."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
            <Plus className="w-4 h-4" /> Nuovo contatto
          </button>
        }
      />

      <div className="p-4 md:p-8">
        {isLoading ? (
          <div className="text-center text-muted-foreground p-10">Caricamento…</div>
        ) : !contacts || contacts.length === 0 ? (
          <div className="bg-card border rounded-lg p-10 text-center">
            <p className="font-medium">Nessun contatto ancora</p>
            <p className="text-sm text-muted-foreground mt-1">Aggiungi il primo contatto commerciale.</p>
          </div>
        ) : (
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">Azienda / Ruolo</th>
                  <th className="text-left px-4 py-3 font-medium">Telefono</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Stato</th>
                  <th className="text-left px-4 py-3 font-medium">Immobile</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{[c.company, c.role].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge label={labelOf(CONTACT_STATUS, c.status)} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{(c as { opportunities?: { title?: string } | null }).opportunities?.title || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => del.mutate(c.id)} className="p-1 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Nuovo contatto</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <FF label="Nome"><II value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} /></FF>
              <FF label="Cognome"><II value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} /></FF>
              <FF label="Azienda"><II value={form.company} onChange={(v) => setForm({ ...form, company: v })} /></FF>
              <FF label="Ruolo"><II value={form.role} onChange={(v) => setForm({ ...form, role: v })} /></FF>
              <FF label="Telefono"><II value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /></FF>
              <FF label="Email"><II type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} /></FF>
              <FF label="Stato">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 bg-background border rounded-md text-sm">
                  {CONTACT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FF>
              <FF label="Immobile collegato">
                <select value={form.opportunity_id} onChange={(e) => setForm({ ...form, opportunity_id: e.target.value })} className="w-full px-3 py-2 bg-background border rounded-md text-sm">
                  <option value="">— Nessuno —</option>
                  {opps?.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </FF>
              <FF label="Note" className="md:col-span-2">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 bg-background border rounded-md text-sm" />
              </FF>
              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border rounded-md text-sm">Annulla</button>
                <button type="submit" disabled={create.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50">
                  {create.isPending ? "Salvataggio…" : "Salva contatto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function FF({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={"block " + className}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function II({ value, onChange, type = "text" }: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
  );
}
