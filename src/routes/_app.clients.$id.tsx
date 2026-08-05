import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useClient,
  useUpdateClient,
  useDocuments,
  useUploadClientFiche,
} from "@/hooks/use-data";
import {
  ClientFicheUpload,
  fileToBase64Payload,
} from "@/components/clients/ClientFicheUpload";
import { StatusBadge } from "@/components/common/StatusBadge";
import { currency, shortDate } from "@/lib/format";
import type { Client } from "@/store/types";

export const Route = createFileRoute("/_app/clients/$id")({
  head: () => ({ meta: [{ title: "Fiche client — 2R Hub" }] }),
  component: EditClient,
});

function EditClient() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const { data: documents = [] } = useDocuments();
  const updateClient = useUpdateClient();
  const uploadFiche = useUploadClientFiche();
  const docs = useMemo(
    () => documents.filter((d) => d.clientId === id),
    [documents, id],
  );
  const [form, setForm] = useState<Client | undefined>(client ?? undefined);
  const [circuitFile, setCircuitFile] = useState<File | null>(null);
  const [statusFile, setStatusFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) setForm(client);
  }, [client]);

  if (isLoading) {
    return (
      <LoadingState
        icon={FileText}
        title="Chargement de la fiche"
        description="Récupération des informations client…"
      />
    );
  }

  if (!client || !form) {
    return <div className="glass-panel rounded-3xl p-8 text-center">Client introuvable.</div>;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateClient.mutateAsync({ ...form, id: client.id });

      const uploads: Array<Promise<unknown>> = [];
      if (circuitFile) {
        const payload = await fileToBase64Payload(circuitFile);
        uploads.push(
          uploadFiche.mutateAsync({
            clientId: client.id,
            kind: "circuit",
            ...payload,
          }),
        );
      }
      if (statusFile) {
        const payload = await fileToBase64Payload(statusFile);
        uploads.push(
          uploadFiche.mutateAsync({
            clientId: client.id,
            kind: "status",
            ...payload,
          }),
        );
      }
      if (uploads.length) await Promise.all(uploads);

      toast.success("Modifications enregistrées");
      void navigate({ to: "/clients" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const subtitleParts = [
    form.sigle || null,
    form.legalForm,
    `Ajouté le ${shortDate(client.createdAt)}`,
  ].filter(Boolean);

  return (
    <div>
      <button onClick={() => history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour</button>
      <PageHeader title={client.name} subtitle={subtitleParts.join(" · ")} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <form onSubmit={save} className="space-y-5">
          <Section title="Identité de l'entreprise">
            <Field label="Dénomination sociale" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Sigle" value={form.sigle} onChange={(v) => setForm({ ...form, sigle: v })} />
            <Field label="Forme juridique" value={form.legalForm} onChange={(v) => setForm({ ...form, legalForm: v })} />
            <Field label="Capital social" value={form.shareCapital} onChange={(v) => setForm({ ...form, shareCapital: v })} />
            <Field label="Activité" value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} />
            <Field label="Nature de l’activité" value={form.activityDetail} onChange={(v) => setForm({ ...form, activityDetail: v })} colSpan />
          </Section>

          <Section title="Identifiants légaux">
            <Field label="N° RCCM" value={form.rccm} onChange={(v) => setForm({ ...form, rccm: v })} colSpan />
            <Field label="N° NIF" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
            <Field label="N° CNSS" value={form.cnss} onChange={(v) => setForm({ ...form, cnss: v })} />
            <Field label="N° CNAMGS" value={form.cnamgs} onChange={(v) => setForm({ ...form, cnamgs: v })} />
            <Field label="NIU (optionnel)" value={form.niu} onChange={(v) => setForm({ ...form, niu: v })} />
          </Section>

          <Section title="Représentant légal & contact">
            <Field label="Représentant légal" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} />
            <Field label="Qualité" value={form.representativeTitle} onChange={(v) => setForm({ ...form, representativeTitle: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </Section>

          <Section title="Adresse">
            <Field label="Quartier" value={form.address} onChange={(v) => setForm({ ...form, address: v })} colSpan />
            <Field label="Boîte postale (BP)" value={form.bp} onChange={(v) => setForm({ ...form, bp: v })} />
            <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="Pays" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          </Section>

          <Section title="Fiche ANPI (optionnel)">
            <Field label="N° fiche ANPI" value={form.anpiNumber} onChange={(v) => setForm({ ...form, anpiNumber: v })} />
            <Field label="Date de la fiche" value={form.anpiDate} onChange={(v) => setForm({ ...form, anpiDate: v })} placeholder="JJ/MM/AAAA" />
          </Section>

          <Section title="Fiches documents">
            <ClientFicheUpload
              label="Fiche circuit"
              file={circuitFile}
              existingUrl={form.ficheCircuitUrl}
              existingName={form.ficheCircuitName}
              onFileChange={setCircuitFile}
              disabled={saving}
            />
            <ClientFicheUpload
              label="Fiche status"
              file={statusFile}
              existingUrl={form.ficheStatusUrl}
              existingName={form.ficheStatusName}
              onFileChange={setStatusFile}
              disabled={saving}
            />
          </Section>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => navigate({ to: "/clients" })} className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted">Annuler</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60">
              <Save className="h-4 w-4" />
              {saving ? "Enregistrement…" : "Sauvegarder"}
            </button>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-3xl p-5">
      <h3 className="font-display font-semibold">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  colSpan,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colSpan?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={colSpan ? "sm:col-span-2 block" : "block"}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
      />
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
