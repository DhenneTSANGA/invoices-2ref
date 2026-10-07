import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { CrmCard, CrmCardGrid } from "@/components/prospection/CrmCards";
import { CRM_PRIMARY_BTN, FilterChip } from "@/components/prospection/CrmUi";
import { shortDate } from "@/lib/format";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospection/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Prospection" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const notifications = useProspectionDemoStore((s) => s.notifications);
  const mark = useProspectionDemoStore((s) => s.markNotificationRead);
  const markAll = useProspectionDemoStore((s) => s.markAllNotificationsRead);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = unreadOnly ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Clic = lu + lien vers l’objet (piste, retard, budget…)."
        actions={
          <button
            type="button"
            className={CRM_PRIMARY_BTN}
            onClick={() => {
              void markAll().then(
                () => toast.success("Tout marqué comme lu"),
                (err) => toast.error(err instanceof Error ? err.message : "Mise à jour impossible"),
              );
            }}
          >
            Tout marquer lu
          </button>
        }
      />
      <div className="mb-4 flex gap-2">
        <FilterChip active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
          Toutes
        </FilterChip>
        <FilterChip active={unreadOnly} onClick={() => setUnreadOnly(true)}>
          Non lues
        </FilterChip>
      </div>
      <CrmCardGrid dense>
        {list.map((n, i) => (
          <Link
            key={n.id}
            to={n.href as "/prospection"}
            onClick={() => {
              void mark(n.id);
            }}
            className="block h-full"
          >
            <CrmCard
              index={i}
              className={cn("h-full", n.read && "opacity-70")}
              accent={n.read ? undefined : "bg-primary"}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    n.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
                  )}
                >
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold leading-tight group-hover:text-primary">
                      {n.title}
                    </h2>
                    {!n.read ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Nouveau
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{shortDate(n.at)}</p>
                </div>
              </div>
            </CrmCard>
          </Link>
        ))}
      </CrmCardGrid>
    </div>
  );
}
