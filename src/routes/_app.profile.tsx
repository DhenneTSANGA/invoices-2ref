import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Mon profil — FacturIA" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div>
      <PageHeader title="Mon profil" subtitle="Vos informations personnelles et préférences." />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
        <div className="glass-panel rounded-3xl p-6 text-center">
          <div className="relative mx-auto h-28 w-28">
            <div className="absolute inset-0 -z-10 rounded-full bg-gradient-primary opacity-30 blur-2xl" />
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-display text-4xl font-bold shadow-glow">YA</div>
          </div>
          <h3 className="mt-4 font-display text-xl font-bold">Yasmine Alaoui</h3>
          <p className="text-sm text-muted-foreground">Expert-comptable agréée</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-2 p-2"><div className="font-display text-lg font-bold">142</div><div className="text-[10px] uppercase text-muted-foreground">Factures</div></div>
            <div className="rounded-xl bg-surface-2 p-2"><div className="font-display text-lg font-bold">89</div><div className="text-[10px] uppercase text-muted-foreground">Devis</div></div>
            <div className="rounded-xl bg-surface-2 p-2"><div className="font-display text-lg font-bold">12</div><div className="text-[10px] uppercase text-muted-foreground">Clients</div></div>
          </div>
          <button onClick={() => toast.success("Photo mise à jour")} className="mt-5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-muted">Changer la photo</button>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h4 className="font-display font-semibold">Informations</h4>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Prénom" defaultValue="Yasmine" />
            <F label="Nom" defaultValue="Alaoui" />
            <F label="Email" defaultValue="yasmine@facturia.ma" />
            <F label="Téléphone" defaultValue="+212 661 12 34 56" />
            <F label="Fonction" defaultValue="Expert-comptable" />
            <F label="Langue" defaultValue="Français" />
          </div>
          <h4 className="mt-8 font-display font-semibold">Préférences</h4>
          <div className="mt-4 space-y-3">
            <Toggle label="Notifications par email" defaultChecked />
            <Toggle label="Rappels automatiques de paiement" defaultChecked />
            <Toggle label="Aperçu temps réel des documents" defaultChecked />
            <Toggle label="Synchronisation calendrier" />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm">Annuler</button>
            <button onClick={() => toast.success("Profil mis à jour")} className="rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input defaultValue={defaultValue} className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition" />
    </label>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 cursor-pointer hover:bg-muted transition-colors">
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative h-6 w-11 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-gradient-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}
