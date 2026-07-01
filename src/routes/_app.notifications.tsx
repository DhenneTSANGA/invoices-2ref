import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAppStore } from "@/store/useAppStore";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — FacturIA" }] }),
  component: NotificationsPage,
});

const typeColor = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", info: "bg-primary" } as const;

function NotificationsPage() {
  const notifications = useAppStore((s) => s.notifications);
  const markAll = useAppStore((s) => s.markAllNotificationsRead);

  return (
    <div>
      <PageHeader title="Centre de notifications" subtitle={`${notifications.filter((n) => !n.read).length} non lues`} actions={
        <button onClick={markAll} className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm hover:bg-muted"><CheckCheck className="h-4 w-4" /> Tout marquer lu</button>
      } />

      <ul className="space-y-2">
        {notifications.map((n, i) => (
          <motion.li
            key={n.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn("glass-panel flex items-start gap-3 rounded-2xl p-4 hover:shadow-glow transition-shadow", !n.read && "ring-1 ring-primary/30")}
          >
            <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow", typeColor[n.type])}>
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{n.title}</div>
                {!n.read && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Nouveau</span>}
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">{shortDate(n.at)}</div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
