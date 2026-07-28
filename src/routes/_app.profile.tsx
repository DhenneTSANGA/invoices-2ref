import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Save } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StaffAvatar } from "@/components/common/StaffAvatar";
import { useSession, sessionKey } from "@/hooks/use-data";
import {
  deleteOwnAccount,
  getMyPendingAdminRequest,
  requestAdminRole,
  updateOwnProfile,
} from "@/lib/admin.functions";
import { changePasswordSchema, profileUpdateSchema } from "@/lib/auth-schemas";
import {
  CABINET_LABELS,
  STAFF_JOB_TITLES,
  jobTitleLabel,
  normalizeJobTitleValue,
  type StaffJobTitleValue,
} from "@/lib/cabinets";
import { roleLabel } from "@/lib/roles";
import { createClient } from "@/lib/client";
import { SUGGEST_PASSWORD_CHANGE_KEY } from "@/lib/auth-password";
import { humanAuthError } from "@/lib/auth-errors";
import { signOut } from "@/lib/auth";
import type { z } from "zod";

type ProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: StaffJobTitleValue | "";
};

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Mon profil — 2R Hub" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: session } = useSession();
  const staff = session?.staff;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    phone: "",
    jobTitle: "",
  });

  useEffect(() => {
    if (!staff) return;
    setForm({
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone ?? "",
      jobTitle: normalizeJobTitleValue(staff.jobTitle) ?? "",
    });
  }, [staff]);

  const { data: pendingRequest } = useQuery({
    queryKey: ["my-admin-request"],
    queryFn: () => getMyPendingAdminRequest(),
    enabled: staff?.role === "member",
  });

  const saveProfile = useMutation({
    mutationFn: (data: z.infer<typeof profileUpdateSchema>) =>
      updateOwnProfile({ data }),
    onSuccess: (updated) => {
      if (session) {
        qc.setQueryData(sessionKey, {
          ...session,
          staff: updated,
        });
      }
      void qc.invalidateQueries({ queryKey: sessionKey });
      toast.success("Profil mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
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
      void navigate({ to: "/login" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    saveProfile.mutate(parsed.data);
  };

  return (
    <div>
      <PageHeader
        title="Mon profil"
        subtitle="Vos informations personnelles et préférences."
        actions={
          <button
            type="submit"
            form="profile-form"
            disabled={saveProfile.isPending || !staff}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saveProfile.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
        <div className="glass-panel rounded-3xl p-6 text-center">
          <div className="relative mx-auto h-28 w-28">
            <div className="absolute inset-0 -z-10 rounded-full bg-gradient-primary opacity-30 blur-2xl" />
            <StaffAvatar
              person={{
                firstName: form.firstName || staff?.firstName || "2R",
                lastName: form.lastName || staff?.lastName || "",
                avatarUrl: staff?.avatarUrl,
              }}
              size="xl"
              className="!h-28 !w-28 shadow-glow ring-4 ring-background"
            />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold">
            {form.firstName || form.lastName
              ? `${form.firstName} ${form.lastName}`.trim()
              : "Collaborateur"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {form.jobTitle ? jobTitleLabel(form.jobTitle) : ""}
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
          <form
            id="profile-form"
            onSubmit={onSave}
            className="glass-panel rounded-3xl p-6"
          >
            <h4 className="font-display font-semibold">Informations</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Modifiez vos coordonnées — les changements sont enregistrés en base.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <F
                label="Prénom"
                value={form.firstName}
                onChange={(v) => setForm({ ...form, firstName: v })}
                required
              />
              <F
                label="Nom"
                value={form.lastName}
                onChange={(v) => setForm({ ...form, lastName: v })}
                required
              />
              <F
                label="Email"
                value={staff?.email ?? session?.user.email ?? ""}
                readOnly
                className="sm:col-span-2"
              />
              <F
                label="Téléphone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Poste <span className="text-danger">*</span>
                </span>
                <select
                  value={form.jobTitle}
                  required
                  onChange={(e) =>
                    setForm({
                      ...form,
                      jobTitle: e.target.value as StaffJobTitleValue | "",
                    })
                  }
                  className="mt-1 w-full appearance-none rounded-xl border border-border/60 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                >
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {STAFF_JOB_TITLES.map((j) => (
                    <option key={j.value} value={j.value}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </label>
              <F
                label="Cabinet"
                value={
                  staff?.cabinet
                    ? CABINET_LABELS[staff.cabinet]
                    : staff?.role === "super_admin"
                      ? "Tous les cabinets"
                      : ""
                }
                readOnly
                className="sm:col-span-2"
              />
            </div>
          </form>

          <ChangePasswordCard />

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

function ChangePasswordCard() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
        data: {
          ...(userData.user?.user_metadata ?? {}),
          [SUGGEST_PASSWORD_CHANGE_KEY]: false,
        },
      });
      if (error) throw error;
      toast.success("Mot de passe mis à jour");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        humanAuthError(err, "Impossible de changer le mot de passe pour le moment."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-panel rounded-3xl p-6">
      <h4 className="font-display font-semibold">Mot de passe</h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Changez le mot de passe de votre compte 2R Hub.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PasswordField
          label="Nouveau mot de passe"
          value={password}
          onChange={setPassword}
          show={show}
          onToggleShow={() => setShow((v) => !v)}
        />
        <PasswordField
          label="Confirmer"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={show}
          onToggleShow={() => setShow((v) => !v)}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
      >
        <Lock className="h-4 w-4" />
        {loading ? "Mise à jour…" : "Changer le mot de passe"}
      </button>
    </form>
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
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative mt-1">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={show ? "text" : "password"}
          value={value}
          autoComplete="new-password"
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border/60 bg-transparent py-2.5 pl-10 pr-11 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={show ? "Masquer" : "Afficher"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function F({
  label,
  value,
  onChange,
  readOnly,
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      <input
        value={value}
        readOnly={readOnly}
        required={required && !readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`mt-1 w-full rounded-xl border border-border/60 px-3 py-2.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          readOnly
            ? "cursor-default bg-muted/40 text-muted-foreground"
            : "bg-transparent"
        }`}
      />
    </label>
  );
}
