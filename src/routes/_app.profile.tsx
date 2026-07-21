import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { useSession } from "@/hooks/use-data";
import { staffInitials } from "@/lib/auth";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Mon profil — 2REF-AUTO" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: session } = useSession();
  const staff = session?.staff;

  return (
    <div>
      <PageHeader
        title="Mon profil"
        subtitle="Vos informations personnelles et préférences."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
        <div className="glass-panel rounded-3xl p-6 text-center">
          <div className="relative mx-auto h-28 w-28">
            <div className="absolute inset-0 -z-10 rounded-full bg-gradient-primary opacity-30 blur-2xl" />
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-display text-4xl font-bold shadow-glow">
              {staff ? staffInitials(staff.firstName, staff.lastName) : "2R"}
            </div>
          </div>
          <h3 className="mt-4 font-display text-xl font-bold">
            {staff ? `${staff.firstName} ${staff.lastName}` : "Collaborateur"}
          </h3>
          <p className="text-sm text-muted-foreground">{staff?.jobTitle ?? ""}</p>
          <p className="mt-2 text-xs text-muted-foreground capitalize">
            Rôle : {staff?.role === "admin" ? "Administrateur" : "Membre"}
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h4 className="font-display font-semibold">Informations</h4>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Prénom" value={staff?.firstName ?? ""} readOnly />
            <F label="Nom" value={staff?.lastName ?? ""} readOnly />
            <F label="Email" value={staff?.email ?? session?.user.email ?? ""} readOnly />
            <F label="Téléphone" value={staff?.phone ?? ""} readOnly />
            <F label="Fonction" value={staff?.jobTitle ?? ""} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
}

function F({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        readOnly={readOnly}
        className="mt-1 w-full rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
      />
    </label>
  );
}
