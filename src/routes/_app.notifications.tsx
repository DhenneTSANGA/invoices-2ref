import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-data";
import type { NotificationItem } from "@/store/types";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — 2R Expertise Fiscale" }] }),
  component: NotificationsPage,
});

const typeColor = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-primary",
} as const;

function NotificationsPage() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllMutation = useMarkAllNotificationsRead();
  const markOneMutation = useMarkNotificationRead();
  const unread = notifications.filter((n) => !n.read).length;

  const openNotification = async (n: NotificationItem) => {
    if (!n.read) {
      try {
        await markOneMutation.mutateAsync(n.id);
      } catch {
        // On navigue quand même vers le document si possible
      }
    }
    if (n.documentId) {
      void navigate({
        to: "/documents",
        search: { focus: n.documentId },
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Centre de notifications"
        subtitle={`${unread} non lues`}
        actions={
          notifications.length > 0 ? (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending || unread === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" /> Tout marquer lu
            </button>
          ) : undefined
        }
      />

      {isLoading ? (
        <LoadingState
          icon={Bell}
          title="Chargement des notifications"
          description="Synchronisation des alertes du cabinet…"
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Les alertes sur les documents du cabinet apparaîtront ici en temps réel."
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n, i) => {
            const clickable = Boolean(n.documentId);
            return (
            <motion.li
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: n.read ? 0.45 : 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "glass-panel flex flex-col gap-2 rounded-2xl p-3 transition-all sm:flex-row sm:items-start sm:gap-3 sm:p-4",
                clickable && "cursor-pointer hover:shadow-glow",
                !n.read && "ring-1 ring-primary/30",
                n.read && "grayscale-[0.35]",
              )}
              onClick={() => void openNotification(n)}
              role={clickable ? "link" : undefined}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow",
                  typeColor[n.type],
                  n.read && "opacity-70",
                )}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={cn(
                      "min-w-0 break-words font-semibold",
                      n.read && "font-medium text-muted-foreground",
                    )}
                  >
                    {n.title}
                  </div>
                  {!n.read && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Nouveau
                    </span>
                  )}
                  {n.read && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Lu
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "break-words text-sm text-muted-foreground",
                    n.read && "text-muted-foreground/70",
                  )}
                >
                  {n.body}
                </p>
              </div>
              </div>
              <div className="shrink-0 self-end text-xs text-muted-foreground sm:self-start">
                {shortDate(n.at)}
              </div>
            </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
