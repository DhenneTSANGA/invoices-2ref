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
  head: () => ({ meta: [{ title: "Nouveau client — 2R" }] }),
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
  legalForm: "SARL",
  nif: "",
  niu: "",
  rccm: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "Gabon",
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
        subtitle="Renseignez les informations légales, le contact et les fiches associées."
      />
      <form onSubmit={submit} className="space-y-5">
        <Section title="Identité de l'entreprise">
          <Field
            label="Raison sociale"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
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
          <Field label="NIF" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} placeholder="Ex. GA20245678901" />
          <Field label="NIU" value={form.niu} onChange={(v) => setForm({ ...form, niu: v })} placeholder="Identifiant CEMAC" />
          <Field
            label="RCCM"
            value={form.rccm}
            onChange={(v) => setForm({ ...form, rccm: v })}
            placeholder="Ex. GA-LBV-01-2020-B12-00045"
            colSpan={2}
          />
        </Section>

        <Section title="Contact principal">
          <Field label="Nom du contact" value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </Section>

        <Section title="Adresse">
          <Field label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} colSpan={2} />
          <Field label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="Pays" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
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
