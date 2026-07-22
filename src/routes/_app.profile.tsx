import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StaffAvatar } from "@/components/common/StaffAvatar";
import { useSession } from "@/hooks/use-data";
import {
  deleteOwnAccount,
  getMyPendingAdminRequest,
  requestAdminRole,
} from "@/lib/admin.functions";
import { CABINET_LABELS, jobTitleLabel } from "@/lib/cabinets";
import { roleLabel } from "@/lib/roles";
import { signOut } from "@/lib/auth";
import { sessionKey } from "@/hooks/use-data";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Mon profil — 2R Expertise Fiscale" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: session } = useSession();
  const staff = session?.staff;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: pendingRequest } = useQuery({
    queryKey: ["my-admin-request"],
    queryFn: () => getMyPendingAdminRequest(),
    enabled: staff?.role === "member",
  });

  const requestAdmin = useMutation({
    mutationFn: () => requestAdminRole(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-admin-request"] });
      toast.success("Demande envoyée aux administrateurs");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAccount = useMutation({
    mutationFn: () => deleteOwnAccount(),
    onSuccess: async () => {
      await signOut();
      qc.setQueryData(sessionKey, null);
      toast.success("Compte supprimé");
      void navigate({ to: "/signup" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
            <StaffAvatar
              person={
                staff ?? {
                  firstName: "2R",
                  lastName: "",
                }
              }
              size="xl"
              className="!h-28 !w-28 shadow-glow ring-4 ring-background"
            />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold">
            {staff ? `${staff.firstName} ${staff.lastName}` : "Collaborateur"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {staff ? jobTitleLabel(staff.jobTitle) : ""}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {staff ? roleLabel(staff.role) : ""}
            {session?.activeCabinet
              ? ` · ${CABINET_LABELS[session.activeCabinet]}`
              : ""}
          </p>
          {staff?.role === "super_admin" && (
            <span className="mt-3 inline-flex rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              Super admin
            </span>
          )}
        </div>

        <div className="space-y-5">
          <div className="glass-panel rounded-3xl p-6">
            <h4 className="font-display font-semibold">Informations</h4>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F label="Prénom" value={staff?.firstName ?? ""} readOnly />
              <F label="Nom" value={staff?.lastName ?? ""} readOnly />
              <F label="Email" value={staff?.email ?? session?.user.email ?? ""} readOnly />
              <F label="Téléphone" value={staff?.phone ?? ""} readOnly />
              <F
                label="Fonction"
                value={staff ? jobTitleLabel(staff.jobTitle) : ""}
                readOnly
              />
            </div>
          </div>

          {staff?.role === "member" && (
            <div className="glass-panel rounded-3xl p-6">
              <h4 className="font-display font-semibold">Droits administrateur</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Demandez l’accès admin pour votre cabinet. Un administrateur devra
                valider.
              </p>
              {pendingRequest ? (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                  Demande en attente depuis le{" "}
                  {new Date(pendingRequest.createdAt).toLocaleDateString("fr-FR")}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={requestAdmin.isPending}
                  onClick={() => requestAdmin.mutate()}
                  className="mt-4 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  Demander le rôle admin
                </button>
              )}
            </div>
          )}

          {staff?.role !== "super_admin" && (
            <div className="glass-panel rounded-3xl border border-danger/30 p-6">
              <h4 className="font-display font-semibold text-danger">
                Zone sensible
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Mauvais cabinet à l’inscription ? Supprimez ce compte puis
                réinscrivez-vous avec le bon cabinet.
              </p>
              <button
                type="button"
                disabled={removeAccount.isPending}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Supprimer définitivement votre compte ? Cette action est irréversible.",
                    )
                  ) {
                    return;
                  }
                  removeAccount.mutate();
                }}
                className="mt-4 rounded-2xl border border-danger/50 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-60"
              >
                Supprimer mon compte
              </button>
            </div>
          )}
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
