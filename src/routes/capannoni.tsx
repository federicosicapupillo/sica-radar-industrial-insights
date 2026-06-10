import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Loader2, Warehouse as WarehouseIcon } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Warehouse = Database["public"]["Tables"]["warehouses"]["Row"];

export const Route = createFileRoute("/capannoni")({
  component: CapannoniPage,
});

const STATUS_OPTIONS = [
  { value: "to_verify", label: "Da verificare" },
  { value: "active", label: "Attivo" },
  { value: "in_progress", label: "In trattativa" },
  { value: "closed", label: "Chiuso" },
  { value: "discarded", label: "Scartato" },
];

const INTENDED_USE_OPTIONS = [
  { value: "logistics", label: "Logistica" },
  { value: "production", label: "Produzione" },
  { value: "storage", label: "Stoccaggio" },
  { value: "mixed", label: "Misto" },
  { value: "other", label: "Altro" },
];

function statusLabel(v: string | null) {
  return STATUS_OPTIONS.find((s) => s.value === v)?.label ?? v ?? "—";
}

function formatPrice(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function CapannoniPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: authChecked && !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Warehouse>) => {
      if (!userId) throw new Error("Utente non autenticato");
      const { error } = await supabase.from("warehouses").insert({
        ...payload,
        user_id: userId,
      } as Database["public"]["Tables"]["warehouses"]["Insert"]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Capannone salvato");
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Errore nel salvataggio"),
  });

  return (
    <div>
      <PageHeader
        title="Capannoni"
        subtitle="Archivio capannoni industriali salvati"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!userId}>
                <PlusCircle className="w-4 h-4" /> Nuovo capannone
              </Button>
            </DialogTrigger>
            <NewWarehouseDialog
              onSubmit={(p) => createMutation.mutate(p)}
              submitting={createMutation.isPending}
            />
          </Dialog>
        }
      />

      <div className="p-4 md:p-8">
        {authChecked && !userId && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Devi essere autenticato per visualizzare i capannoni.
            </CardContent>
          </Card>
        )}

        {userId && isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">
              Errore: {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {userId && !isLoading && data && data.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center">
              <WarehouseIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">Nessun capannone salvato</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aggiungi il primo capannone per iniziare a costruire il tuo archivio.
              </p>
              <Button onClick={() => setOpen(true)}>
                <PlusCircle className="w-4 h-4" /> Nuovo capannone
              </Button>
            </CardContent>
          </Card>
        )}

        {userId && data && data.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.map((w) => (
              <Card key={w.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium leading-tight">
                        {w.name || w.address || "Capannone senza nome"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[w.municipality, w.province].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <Badge variant="secondary">{statusLabel(w.opportunity_status)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
                    <div><span className="text-foreground">Zona:</span> {w.industrial_area || "—"}</div>
                    <div><span className="text-foreground">Mq coperti:</span> {w.covered_sqm ?? "—"}</div>
                    <div><span className="text-foreground">Uso:</span> {w.intended_use || "—"}</div>
                    <div><span className="text-foreground">Vendita:</span> {formatPrice(w.asking_price)}</div>
                    <div className="col-span-2"><span className="text-foreground">Affitto:</span> {formatPrice(w.rent_price)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewWarehouseDialog({
  onSubmit,
  submitting,
}: {
  onSubmit: (p: Partial<Warehouse>) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    municipality: "",
    province: "",
    address: "",
    industrial_area: "",
    covered_sqm: "",
    asking_price: "",
    rent_price: "",
    intended_use: "",
    opportunity_status: "to_verify",
    commercial_notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    onSubmit({
      name: form.name || null,
      municipality: form.municipality || null,
      province: form.province || null,
      address: form.address || null,
      industrial_area: form.industrial_area || null,
      covered_sqm: num(form.covered_sqm),
      asking_price: num(form.asking_price),
      rent_price: num(form.rent_price),
      intended_use: form.intended_use || null,
      opportunity_status: form.opportunity_status,
      commercial_notes: form.commercial_notes || null,
    });
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Nuovo capannone</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="name">Nome / riferimento</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="municipality">Comune</Label>
          <Input id="municipality" value={form.municipality} onChange={(e) => set("municipality", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="province">Provincia</Label>
          <Input id="province" maxLength={2} value={form.province} onChange={(e) => set("province", e.target.value.toUpperCase())} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="address">Indirizzo</Label>
          <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="industrial_area">Zona industriale</Label>
          <Input id="industrial_area" value={form.industrial_area} onChange={(e) => set("industrial_area", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="covered_sqm">Mq coperti</Label>
          <Input id="covered_sqm" type="number" value={form.covered_sqm} onChange={(e) => set("covered_sqm", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="asking_price">Prezzo vendita (€)</Label>
          <Input id="asking_price" type="number" value={form.asking_price} onChange={(e) => set("asking_price", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="rent_price">Canone affitto (€)</Label>
          <Input id="rent_price" type="number" value={form.rent_price} onChange={(e) => set("rent_price", e.target.value)} />
        </div>
        <div>
          <Label>Destinazione d'uso</Label>
          <Select value={form.intended_use} onValueChange={(v) => set("intended_use", v)}>
            <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
            <SelectContent>
              {INTENDED_USE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Stato</Label>
          <Select value={form.opportunity_status} onValueChange={(v) => set("opportunity_status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="commercial_notes">Note commerciali</Label>
          <Textarea id="commercial_notes" rows={3} value={form.commercial_notes} onChange={(e) => set("commercial_notes", e.target.value)} />
        </div>
        <DialogFooter className="md:col-span-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Salva capannone
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
