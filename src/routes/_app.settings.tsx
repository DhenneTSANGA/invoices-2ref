import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Building2, Receipt, Palette, ShieldCheck, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useCompany,
  useUpdateCompany,
  useSession,
  useUploadCompanySignature,
} from "@/hooks/use-data";
import { Logo } from "@/components/common/Logo";
import { COMPANY_DEFAULTS } from "@/lib/company-defaults";
import type { CompanyInfo } from "@/store/types";
import { cn } from "@/lib/utils";
import { canEditCompanySettings } from "@/lib/roles";
import { getCurrentSession } from "@/lib/session.functions";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { ManagerSignature } from "@/components/signature/ManagerSignature";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Paramètres — 2R Hub" }] }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session && !canEditCompanySettings(session.staff.role)) {
      throw redirect({ to: "/home" });
    }
  },
  component: SettingsPage,
});

const tabs = [
  { id: "company", label: "Cabinet", icon: Building2 },
  { id: "fiscal", label: "Fiscal & Bancaire", icon: Receipt },
  { id: "branding", label: "Apparence", icon: Palette },
  { id: "security", label: "Sécurité", icon: ShieldCheck },
];

function SettingsPage() {
  const { data: session } = useSession();
  const { data: company, isLoading: loadingCompany } = useCompany();
  const updateCompany = useUpdateCompany();
  const uploadSignature = useUploadCompanySignature();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("company");
  const fallback =
    COMPANY_DEFAULTS[session?.activeCabinet ?? "expertise_fiscale"];
  const [form, setForm] = useState<CompanyInfo>(fallback);

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

  const saveSignatureFromDataUrl = async (dataUrl: string, fileName?: string) => {
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
    if (!match) {
      toast.error("Format d'image non supporté");
      return;
    }
    const contentType = match[1] as "image/png" | "image/jpeg" | "image/webp";
    const base64 = match[2];
    try {
      const updated = await uploadSignature.mutateAsync({
        base64,
        contentType,
        fileName,
      });
      setForm(updated);
      toast.success("Signature électronique enregistrée");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Enregistrement de la signature impossible",
      );
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Utilisez une image PNG, JPEG ou WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 2 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        void saveSignatureFromDataUrl(result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loadingCompany) {
    return (
      <LoadingState
        icon={Building2}
        title="Chargement des paramètres"
        description="Récupération des informations du cabinet…"
      />
    );
  }

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
              <F label="Email (affiché sur documents)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <F label="Site web" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
              <F
                label="Adresse d’envoi Resend (From)"
                value={form.mailFromEmail ?? ""}
                onChange={(v) => setForm({ ...form, mailFromEmail: v })}
              />
              <F
                label="Adresse de réponse (Reply-To)"
                value={form.mailReplyTo ?? ""}
                onChange={(v) => setForm({ ...form, mailReplyTo: v })}
              />
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Domaine Resend vérifié : <code>2r-hub.com</code>. Expertise
                fiscale → <code>2ref@2r-hub.com</code> ; 2R Conseil →{" "}
                <code>2rconseil@2r-hub.com</code>. Le Reply-To reçoit les
                réponses clients (Resend Inbound → page Mails).
              </p>
              <F
                label="Nom du gérant (signataire des courriels)"
                value={form.managerName ?? ""}
                onChange={(v) => setForm({ ...form, managerName: v })}
                colSpan
              />

              <div className="sm:col-span-2 space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div>
                  <h4 className="font-display text-sm font-semibold">
                    Signature électronique du gérant
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dessinez ou importez une signature manuscrite. Elle sera
                    réutilisée automatiquement sur les courriels signés.
                  </p>
                </div>

                <div className="flex flex-wrap items-start gap-6">
                  <div className="rounded-2xl border border-border/50 bg-white p-4">
                    <ManagerSignature
                      signatureUrl={form.stampUrl}
                      managerName={form.managerName}
                      signatoryTitle="Le Gérant"
                      applied
                      accent="#01004C"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <SignaturePad
                      disabled={uploadSignature.isPending}
                      onCapture={(dataUrl) => {
                        void saveSignatureFromDataUrl(dataUrl, "signature.png");
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          void onFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadSignature.isPending}
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
                      >
                        <Upload className="h-4 w-4" />
                        Importer une image
                      </button>
                      {form.stampUrl ? (
                        <button
                          type="button"
                          disabled={uploadSignature.isPending || updateCompany.isPending}
                          onClick={() => {
                            setForm({ ...form, stampUrl: "" });
                            void updateCompany
                              .mutateAsync({ ...form, stampUrl: "" })
                              .then(() => toast.success("Signature retirée"))
                              .catch(() =>
                                toast.error("Impossible de retirer la signature"),
                              );
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/15 disabled:opacity-60"
                        >
                          Retirer
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === "fiscal" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="NIF" value={form.nif} onChange={(v) => setForm({ ...form, nif: v })} />
              <F label="NIU" value={form.niu === "—" ? "" : form.niu} onChange={(v) => setForm({ ...form, niu: v || "—" })} />
              <F label="RCCM" value={form.rccm} onChange={(v) => setForm({ ...form, rccm: v })} colSpan />
              <F label="CNSS" value={form.cnss} onChange={(v) => setForm({ ...form, cnss: v })} />
              <F label="Banque" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} />
              <F label="RIB" value={form.bankAccount} onChange={(v) => setForm({ ...form, bankAccount: v })} colSpan />
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
