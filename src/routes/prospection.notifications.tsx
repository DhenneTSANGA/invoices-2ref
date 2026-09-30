import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/prospection/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Prospection" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const notifications = useProspectionDemoStore((s) => s.notifications);
  const mark = useProspectionDemoStore((s) => s.markNotificationRead);

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Pistes, retards, budget, signatures." />
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id}>
            <Link
              to={n.href as "/prospection"}
              onClick={() => mark(n.id)}
              className={`glass-panel block rounded-2xl px-4 py-3 ${n.read ? "opacity-70" : ""}`}
            >
              <div className="font-medium">{n.title}</div>
              <div className="text-sm text-muted-foreground">{n.body}</div>
              <div className="text-xs text-muted-foreground">{shortDate(n.at)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
