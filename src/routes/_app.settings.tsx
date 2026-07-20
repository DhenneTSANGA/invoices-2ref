import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Building2, Receipt, Palette, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useCompany, useUpdateCompany } from "@/hooks/use-data";
import { Logo } from "@/components/common/Logo";
import { REAL_2REF_COMPANY } from "@/lib/company-defaults";
import type { CompanyInfo } from "@/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Paramètres — 2REF-AUTO" }] }),
  component: SettingsPage,
});

const tabs = [
  { id: "company", label: "Cabinet", icon: Building2 },
  { id: "fiscal", label: "Fiscal & Bancaire", icon: Receipt },
  { id: "branding", label: "Apparence", icon: Palette },
  { id: "security", label: "Sécurité", icon: ShieldCheck },
];

function SettingsPage() {
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();
  const [tab, setTab] = useState("company");
  const [form, setForm] = useState<CompanyInfo>(REAL_2REF_COMPANY);

  useEffect(() => {
    if (company) setForm(company);
  }, [company]);

  const save = async () => {
    try {
      await updateCompany.mutateAsync(form);
      toast.success("Informations du cabinet enregistrées");
    } catch {
      toast.error("Impossible d'enregistrer les modifications");
    }
  };

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Configurez votre cabinet et vos préférences." actions={
        <button onClick={save} disabled={updateCompany.isPending} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"><Save className="h-4 w-4" /> Enregistrer</button>
      } />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[240px_1fr]">
        <nav className="glass-panel h-fit rounded-3xl p-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors", tab === t.id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "hover:bg-muted")}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="glass-panel rounded-3xl p-6">
          {tab === "company" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="Nom du cabinet" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <F label="Forme juridique / activité" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />
              <F label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} colSpan />
              <F label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <F label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <F label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <F label="Site web" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
            </div>
          )}
          {tab === "fiscal" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="NIF" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
              <F label="NIU" value={form.niu === "—" ? "" : form.niu} onChange={(v) => setForm({ ...form, niu: v || "—" })} />
              <F label="RCCM" value={form.rccm} onChange={(v) => setForm({ ...form, rccm: v })} colSpan />
              <F label="CNSS" value={form.cnss} onChange={(v) => setForm({ ...form, cnss: v })} />
              <F label="Banque" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} />
              <F label="N° de compte" value={form.bankAccount} onChange={(v) => setForm({ ...form, bankAccount: v })} colSpan />
            </div>
          )}
          {tab === "branding" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-mesh p-6">
                <h4 className="font-display font-semibold">Couleur primaire</h4>
                <p className="text-xs text-muted-foreground">Cette couleur est utilisée pour les boutons, accents et entêtes.</p>
                <div className="mt-4 flex gap-3">
                  {["#1E40AF", "#0EA5E9", "#7C3AED", "#0D9488", "#DC2626"].map((c) => (
                    <button key={c} className="h-10 w-10 rounded-2xl shadow-soft ring-2 ring-transparent hover:ring-foreground/30 transition" style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-surface-2 p-6">
                <h4 className="font-display font-semibold">Logo</h4>
                <div className="mt-3 flex items-center gap-3">
                  <Logo size="lg" className="rounded-xl" />
                  <button className="rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">Téléverser un logo</button>
                </div>
              </div>
            </div>
          )}
          {tab === "security" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface-2 p-5">
                <h4 className="font-display font-semibold">Authentification à deux facteurs</h4>
                <p className="text-sm text-muted-foreground">Renforcez la sécurité de votre compte.</p>
                <button onClick={() => toast.success("2FA activée")} className="mt-3 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">Activer la 2FA</button>
              </div>
              <div className="rounded-2xl bg-surface-2 p-5">
                <h4 className="font-display font-semibold">Sessions actives</h4>
                <p className="text-sm text-muted-foreground">Gérez les appareils connectés à votre compte.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, colSpan }: { label: string; value: string; onChange: (v: string) => void; colSpan?: boolean }) {
  return (
    <label className={colSpan ? "sm:col-span-2 block" : "block"}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
    </label>
  );
}
