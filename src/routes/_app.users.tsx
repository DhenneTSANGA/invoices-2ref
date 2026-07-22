import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { useSession } from "@/hooks/use-data";
import {
  listAdminRequests,
  listCabinetStaff,
  reviewAdminRequest,
  setStaffAdminRole,
} from "@/lib/admin.functions";
import {
  canManageAdminRequests,
  canPromoteOrDemoteAdmins,
  roleLabel,
} from "@/lib/roles";
import { CABINET_LABELS } from "@/lib/cabinets";
import { getCurrentSession } from "@/lib/session.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Équipe — 2R" }] }),
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
        subtitle="Collaborateurs du cabinet et demandes d’administration."
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
                      <div className="flex justify-end">
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
