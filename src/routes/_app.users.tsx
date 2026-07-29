import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Shield,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { useSession } from "@/hooks/use-data";
import {
  createStaffWithPassword,
  deleteStaffMember,
  listAdminRequests,
  listCabinetStaff,
  reviewAdminRequest,
  setStaffAdminRole,
} from "@/lib/admin.functions";
import { createStaffWithPasswordSchema } from "@/lib/auth-schemas";
import {
  canInviteStaff,
  canManageAdminRequests,
  canPromoteOrDemoteAdmins,
  roleLabel,
} from "@/lib/roles";
import { CABINET_LABELS, STAFF_JOB_TITLES, jobTitleLabel } from "@/lib/cabinets";
import { getCurrentSession } from "@/lib/session.functions";
import { humanAuthError } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Équipe — 2R Hub" }] }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session || !canManageAdminRequests(session.staff.role)) {
      throw redirect({ to: "/home" });
    }
  },
  component: UsersPage,
});

const requestsKey = ["admin-requests"] as const;
const staffKey = ["cabinet-staff"] as const;

function UsersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isSuper = session ? canPromoteOrDemoteAdmins(session.staff.role) : false;
  const canCreate = session ? canInviteStaff(session.staff.role) : false;

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: requestsKey,
    queryFn: () => listAdminRequests(),
  });
  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: staffKey,
    queryFn: () => listCabinetStaff(),
  });

  const review = useMutation({
    mutationFn: (data: { id: string; decision: "accepted" | "rejected" }) =>
      reviewAdminRequest({ data }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: requestsKey });
      void qc.invalidateQueries({ queryKey: staffKey });
      toast.success("Demande traitée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: (data: { staffId: string; role: "member" | "admin" }) =>
      setStaffAdminRole({ data }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKey });
      toast.success("Rôle mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: (staffId: string) => deleteStaffMember({ data: { staffId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffKey });
      toast.success("Collaborateur supprimé");
      setDeleteTarget(null);
    },
    onError: (e: Error) => {
      toast.error(humanAuthError(e, "Impossible de supprimer ce collaborateur."));
      setDeleteTarget(null);
    },
  });

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  if (loadingRequests || loadingStaff) {
    return (
      <LoadingState
        icon={UserRound}
        title="Chargement de l’équipe"
        description="Récupération des membres et des demandes…"
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Équipe"
        subtitle="Création d’accès, collaborateurs et demandes d’administration."
      />

      {canCreate ? <CreateStaffCard /> : null}

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        name={deleteTarget?.name ?? ""}
        loading={removeMember.isPending}
        onConfirm={() => {
          if (deleteTarget) removeMember.mutate(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="glass-panel mb-6 rounded-3xl p-5">
        <h3 className="font-display font-semibold">Demandes admin en attente</h3>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucune demande.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 px-4 py-3"
              >
                <div>
                  <div className="font-medium">
                    {r.staff.firstName} {r.staff.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.jobTitleLabel}
                    {r.staff.cabinet
                      ? ` · ${CABINET_LABELS[r.staff.cabinet]}`
                      : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    variant="success"
                    icon={Check}
                    onClick={() =>
                      review.mutate({ id: r.id, decision: "accepted" })
                    }
                    disabled={review.isPending}
                  >
                    Accepter
                  </ActionButton>
                  <ActionButton
                    variant="danger"
                    icon={X}
                    onClick={() =>
                      review.mutate({ id: r.id, decision: "rejected" })
                    }
                    disabled={review.isPending}
                  >
                    Refuser
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-panel rounded-3xl p-5">
        <h3 className="font-display font-semibold">Collaborateurs</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Nom</th>
                <th className="px-2 py-2 text-left">Fonction</th>
                <th className="px-2 py-2 text-left">Rôle</th>
                {isSuper && <th className="px-2 py-2 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-border/40">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-medium">
                          {s.firstName} {s.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">{s.jobTitleLabel}</td>
                  <td className="px-2 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        s.role === "admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {s.role === "admin" && <Shield className="h-3 w-3" />}
                      {roleLabel(s.role)}
                    </span>
                  </td>
                  {isSuper && (
                    <td className="px-2 py-2.5">
                      <div className="flex justify-end gap-2">
                        {s.role === "admin" ? (
                          <ActionButton
                            variant="muted"
                            icon={ArrowDownCircle}
                            onClick={() =>
                              setRole.mutate({ staffId: s.id, role: "member" })
                            }
                            disabled={setRole.isPending}
                          >
                            Rétrograder
                          </ActionButton>
                        ) : (
                          <ActionButton
                            variant="primary"
                            icon={ArrowUpCircle}
                            onClick={() =>
                              setRole.mutate({ staffId: s.id, role: "admin" })
                            }
                            disabled={setRole.isPending}
                          >
                            Promouvoir admin
                          </ActionButton>
                        )}
                        {s.role !== "super_admin" && (
                          <ActionButton
                            variant="danger"
                            icon={Trash2}
                            onClick={() =>
                              setDeleteTarget({
                                id: s.id,
                                name: `${s.firstName} ${s.lastName}`,
                              })
                            }
                            disabled={removeMember.isPending}
                          >
                            Supprimer
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreateStaffCard() {
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    cabinet: string;
    role: string;
    jobTitle: string;
  } | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "" as string,
    cabinet: "" as string,
    role: "member" as "member" | "admin",
    password: "",
    confirmPassword: "",
  });

  const create = useMutation({
    mutationFn: () => {
      const parsed = createStaffWithPasswordSchema.safeParse(form);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      }
      return createStaffWithPassword({ data: parsed.data }).then((res) => ({
        res,
        password: parsed.data.password,
        snapshot: parsed.data,
      }));
    },
    onSuccess: ({ res, password, snapshot }) => {
      void qc.invalidateQueries({ queryKey: staffKey });
      setCredentials({
        firstName: snapshot.firstName,
        lastName: snapshot.lastName,
        email: res.staff.email,
        password,
        cabinet: CABINET_LABELS[snapshot.cabinet],
        role: roleLabel(snapshot.role),
        jobTitle: jobTitleLabel(snapshot.jobTitle),
      });
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        jobTitle: "",
        cabinet: "",
        role: "member",
        password: "",
        confirmPassword: "",
      });
    },
    onError: (e: Error) =>
      toast.error(humanAuthError(e, "La création du compte a échoué. Réessayez."), {
        duration: 12_000,
      }),
  });

  return (
    <>
      <div className="glass-panel mb-6 rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <UserPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold">Créer un accès collaborateur</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun e-mail automatique. Définissez l’e-mail et le mot de passe, puis
              communiquez-les vous-même à l’utilisateur. Il pourra changer son mot de
              passe dans Profil.
            </p>
          </div>
        </div>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Field
            label="Prénom"
            value={form.firstName}
            onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
          />
          <Field
            label="Nom"
            value={form.lastName}
            onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          />
          <Field
            label="Téléphone (optionnel)"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cabinet
            </span>
            <select
              value={form.cabinet}
              onChange={(e) => setForm((f) => ({ ...f, cabinet: e.target.value }))}
              className="w-full rounded-2xl border border-border/60 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            >
              <option value="">Choisir…</option>
              <option value="conseil">{CABINET_LABELS.conseil}</option>
              <option value="expertise_fiscale">
                {CABINET_LABELS.expertise_fiscale}
              </option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Poste
            </span>
            <select
              value={form.jobTitle}
              onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              className="w-full rounded-2xl border border-border/60 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            >
              <option value="">Choisir…</option>
              {STAFF_JOB_TITLES.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rôle initial
            </span>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value as "member" | "admin",
                }))
              }
              className="w-full rounded-2xl border border-border/60 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 sm:max-w-xs"
            >
              <option value="member">Membre</option>
              <option value="admin">Administrateur</option>
            </select>
          </label>
          <PasswordField
            label="Mot de passe"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            show={showPassword}
            onToggleShow={() => setShowPassword((v) => !v)}
          />
          <PasswordField
            label="Confirmer le mot de passe"
            value={form.confirmPassword}
            onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
            show={showPassword}
            onToggleShow={() => setShowPassword((v) => !v)}
          />

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={create.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              <UserPlus className="h-4 w-4" />
              {create.isPending ? "Création…" : "Créer le compte"}
            </button>
          </div>
        </form>
      </div>

      <CredentialsModal
        open={Boolean(credentials)}
        credentials={credentials}
        onClose={() => setCredentials(null)}
      />
    </>
  );
}

function CredentialsModal({
  open,
  credentials,
  onClose,
}: {
  open: boolean;
  credentials: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    cabinet: string;
    role: string;
    jobTitle: string;
  } | null;
  onClose: () => void;
}) {
  if (!credentials) return null;

  const summary = [
    `Nom : ${credentials.firstName} ${credentials.lastName}`,
    `E-mail : ${credentials.email}`,
    `Mot de passe : ${credentials.password}`,
    `Cabinet : ${credentials.cabinet}`,
    `Poste : ${credentials.jobTitle}`,
    `Rôle : ${credentials.role}`,
  ].join("\n");

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-lg [&>button]:hidden">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-background shadow-float">
          <div className="relative overflow-hidden bg-gradient-primary px-6 py-7 text-primary-foreground">
            <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 left-10 h-28 w-28 rounded-full bg-black/10 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="font-display text-xl text-primary-foreground">
                  Accès créé
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/80">
                  Copiez ces identifiants et envoyez-les à l’utilisateur. Ils ne
                  seront plus affichés après fermeture.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="space-y-3 p-5 sm:p-6">
            <div className="rounded-2xl border border-border/60 bg-surface/60 px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Collaborateur
              </div>
              <div className="mt-1 font-display text-lg font-semibold">
                {credentials.firstName} {credentials.lastName}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {credentials.jobTitle} · {credentials.role} · {credentials.cabinet}
              </div>
            </div>

            <CredentialRow
              label="Adresse e-mail"
              value={credentials.email}
              onCopy={() => void copy(credentials.email, "E-mail")}
            />
            <CredentialRow
              label="Mot de passe"
              value={credentials.password}
              mono
              onCopy={() => void copy(credentials.password, "Mot de passe")}
            />

            <button
              type="button"
              onClick={() => void copy(summary, "Identifiants")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <Copy className="h-4 w-4" />
              Tout copier
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              J’ai noté les identifiants
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({
  label,
  value,
  mono,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div
            className={cn(
              "mt-1 truncate text-sm font-medium",
              mono && "font-mono tracking-wide",
            )}
          >
            {value}
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
        >
          <Copy className="h-3.5 w-3.5" />
          Copier
        </button>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={show ? "text" : "password"}
          value={value}
          autoComplete="new-password"
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-border/60 bg-surface/70 py-2.5 pl-10 pr-11 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border/60 bg-surface/70 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
      />
    </label>
  );
}

function DeleteConfirmDialog({
  open,
  name,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  name: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer le collaborateur</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer <strong>{name}</strong> ?
            Son compte sera définitivement supprimé de la plateforme et de
            l'authentification. Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {loading ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant,
  icon: Icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: "primary" | "success" | "danger" | "muted";
  icon: typeof Check;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-60",
        variant === "primary" &&
          "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95",
        variant === "success" &&
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        variant === "danger" &&
          "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        variant === "muted" &&
          "border border-border bg-surface text-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
