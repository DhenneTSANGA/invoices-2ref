import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useCreateClient, useUploadClientFiche } from "@/hooks/use-data";
import {
  ClientFicheUpload,
  fileToBase64Payload,
} from "@/components/clients/ClientFicheUpload";
import type { Client } from "@/store/types";

export const Route = createFileRoute("/_app/clients/new")({
  head: () => ({ meta: [{ title: "Nouveau client — 2R Hub" }] }),
  component: NewClient,
});

const empty: Omit<
  Client,
  | "id"
  | "createdAt"
  | "cabinet"
  | "ficheCircuitUrl"
  | "ficheCircuitName"
  | "ficheStatusUrl"
  | "ficheStatusName"
> = {
  name: "",
  sigle: "",
  legalForm: "SARL",
  shareCapital: "",
  nif: "",
  niu: "",
  rccm: "",
  cnss: "",
  cnamgs: "",
  activity: "",
  activityDetail: "",
  contactName: "",
  representativeTitle: "",
  email: "",
  phone: "",
  address: "",
  bp: "",
  city: "",
  country: "Gabon",
  anpiNumber: "",
  anpiDate: "",
};

function NewClient() {
  const navigate = useNavigate();
  const createClient = useCreateClient();
  const uploadFiche = useUploadClientFiche();
  const [form, setForm] = useState(empty);
  const [circuitFile, setCircuitFile] = useState<File | null>(null);
  const [statusFile, setStatusFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      const c = await createClient.mutateAsync(form);

      const uploads: Array<Promise<unknown>> = [];
      if (circuitFile) {
        const payload = await fileToBase64Payload(circuitFile);
        uploads.push(
          uploadFiche.mutateAsync({
            clientId: c.id,
            kind: "circuit",
            ...payload,
          }),
        );
      }
      if (statusFile) {
        const payload = await fileToBase64Payload(statusFile);
        uploads.push(
          uploadFiche.mutateAsync({
            clientId: c.id,
            kind: "status",
            ...payload,
          }),
        );
      }
      if (uploads.length) {
        await Promise.all(uploads);
      }

      toast.success("Client créé", { description: c.name });
      void navigate({ to: "/clients" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => history.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <PageHeader
        title="Nouveau client"
        subtitle="Saisissez les informations de la fiche unique d’enregistrement ANPI, le contact métier et les fiches associées."
      />
      <form onSubmit={submit} className="space-y-5">
        <Section title="Identité de l'entreprise">
          <Field
            label="Dénomination sociale"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
          />
          <Field
            label="Sigle"
            value={form.sigle}
            onChange={(v) => setForm({ ...form, sigle: v })}
          />
          <Select
            label="Forme juridique"
            value={form.legalForm}
            onChange={(v) => setForm({ ...form, legalForm: v })}
            options={[
              "SARL",
              "SA",
              "SAS",
              "SNC",
              "Entreprise individuelle",
              "Personne physique",
            ]}
          />
          <Field
            label="Capital social"
            value={form.shareCapital}
            onChange={(v) => setForm({ ...form, shareCapital: v })}
          />
          <Field
            label="Activité"
            value={form.activity}
            onChange={(v) => setForm({ ...form, activity: v })}
          />
          <Field
            label="Nature de l’activité"
            value={form.activityDetail}
            onChange={(v) => setForm({ ...form, activityDetail: v })}
            colSpan={2}
          />
        </Section>

        <Section title="Identifiants légaux">
          <Field
            label="N° RCCM"
            value={form.rccm}
            onChange={(v) => setForm({ ...form, rccm: v })}
            colSpan={2}
          />
          <Field
            label="N° NIF"
            value={form.nif}
            onChange={(v) => setForm({ ...form, nif: v })}
          />
          <Field
            label="N° CNSS"
            value={form.cnss}
            onChange={(v) => setForm({ ...form, cnss: v })}
          />
          <Field
            label="N° CNAMGS"
            value={form.cnamgs}
            onChange={(v) => setForm({ ...form, cnamgs: v })}
          />
          <Field
            label="NIU (optionnel)"
            value={form.niu}
            onChange={(v) => setForm({ ...form, niu: v })}
          />
        </Section>

        <Section title="Représentant légal & contact">
          <Field
            label="Représentant légal"
            value={form.contactName}
            onChange={(v) => setForm({ ...form, contactName: v })}
          />
          <Field
            label="Qualité"
            value={form.representativeTitle}
            onChange={(v) => setForm({ ...form, representativeTitle: v })}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
          <Field
            label="Téléphone"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
        </Section>

        <Section title="Adresse">
          <Field
            label="Quartier"
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
            colSpan={2}
          />
          <Field
            label="Boîte postale (BP)"
            value={form.bp}
            onChange={(v) => setForm({ ...form, bp: v })}
          />
          <Field
            label="Ville"
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
          />
          <Field
            label="Pays"
            value={form.country}
            onChange={(v) => setForm({ ...form, country: v })}
            colSpan={2}
          />
        </Section>

        <Section title="Fiche ANPI (optionnel)">
          <Field
            label="N° fiche ANPI"
            value={form.anpiNumber}
            onChange={(v) => setForm({ ...form, anpiNumber: v })}
          />
          <Field
            label="Date de la fiche"
            value={form.anpiDate}
            onChange={(v) => setForm({ ...form, anpiDate: v })}
            placeholder="JJ/MM/AAAA"
          />
        </Section>

        <Section title="Fiches documents">
          <ClientFicheUpload
            label="Fiche circuit"
            file={circuitFile}
            onFileChange={setCircuitFile}
            disabled={saving}
          />
          <ClientFicheUpload
            label="Fiche status"
            file={statusFile}
            onFileChange={setStatusFile}
            disabled={saving}
          />
        </Section>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/clients" })}
            className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
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
  type = "text",
  placeholder,
  required,
  colSpan,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  colSpan?: number;
}) {
  return (
    <label className={colSpan === 2 ? "sm:col-span-2 block" : "block"}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border/60 bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
