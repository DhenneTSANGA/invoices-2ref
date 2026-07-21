import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useClient, useUpdateClient, useDocuments } from "@/hooks/use-data";
import { StatusBadge } from "@/components/common/StatusBadge";
import { currency, shortDate } from "@/lib/format";
import type { Client } from "@/store/types";

export const Route = createFileRoute("/_app/clients/$id")({
  head: () => ({ meta: [{ title: "Fiche client — 2REF-AUTO" }] }),
  component: EditClient,
});

function EditClient() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const { data: documents = [] } = useDocuments();
  const updateClient = useUpdateClient();
  const docs = useMemo(
    () => documents.filter((d) => d.clientId === id),
    [documents, id],
  );
  const [form, setForm] = useState<Client | undefined>(client);

  useEffect(() => {
    if (client) setForm(client);
  }, [client]);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Chargement…</div>;
  }

  if (!client || !form) {
    return <div className="glass-panel rounded-3xl p-8 text-center">Client introuvable.</div>;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateClient.mutateAsync({ ...form, id: client.id });
      toast.success("Modifications enregistrées");
      void navigate({ to: "/clients" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <PageHeader title={client.name} subtitle={`${client.legalForm} · Ajouté le ${shortDate(client.createdAt)}`} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <form onSubmit={save} className="space-y-5">
          <div className="glass-panel rounded-3xl p-5">
            <h3 className="font-display font-semibold">Identité</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Raison sociale" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Forme juridique" value={form.legalForm} onChange={(v) => setForm({ ...form, legalForm: v })} />
              <Field label="NIF" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
              <Field label="NIU" value={form.niu} onChange={(v) => setForm({ ...form, niu: v })} />
              <Field label="RCCM" value={form.rccm} onChange={(v) => setForm({ ...form, rccm: v })} colSpan />
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <h3 className="font-display font-semibold">Contact & adresse</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Contact" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} colSpan />
              <Field label="Pays" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => navigate({ to: "/clients" })} className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted">Annuler</button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"><Save className="h-4 w-4" /> Sauvegarder</button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="glass-panel rounded-3xl p-5">
            <h3 className="font-display font-semibold">Statistiques</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Documents" value={String(docs.length)} />
              <Stat label="Factures payées" value={String(docs.filter((d) => d.status === "paid").length)} />
              <Stat label="CA total" value={currency(docs.filter((d) => d.type === "invoice").reduce((a, b) => a + b.total, 0))} className="col-span-2" />
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-5">
            <h3 className="font-display font-semibold">Historique des documents</h3>
            <ul className="mt-3 space-y-1">
              {docs.length === 0 && <li className="text-sm italic text-muted-foreground">Aucun document.</li>}
              {docs.map((d) => (
                <li key={d.id}>
                  <Link to={d.type === "invoice" ? "/invoices/$id" : "/quotations/$id"} params={{ id: d.id }} className="flex items-center gap-2 rounded-xl p-2 hover:bg-muted">
                    {d.type === "invoice" ? <ReceiptText className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-accent" />}
                    <span className="text-sm font-medium">{d.number}</span>
                    <StatusBadge status={d.status} className="ml-auto" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, colSpan }: { label: string; value: string; onChange: (v: string) => void; colSpan?: boolean }) {
  return (
    <label className={colSpan ? "sm:col-span-2 block" : "block"}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
    </label>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface-2 p-3 ${className ?? ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
    </div>
  );
}
