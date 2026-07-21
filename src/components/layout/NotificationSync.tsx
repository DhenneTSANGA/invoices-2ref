import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  documentsKey,
  notificationsKey,
  useNotifications,
} from "@/hooks/use-data";

/** Polling + toasts quand un autre collaborateur met à jour un document. */
export function NotificationSync() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const initialized = useRef(false);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    if (!initialized.current) {
      for (const n of notifications) seenIds.current.add(n.id);
      initialized.current = true;
      return;
    }

    const fresh = notifications.filter((n) => !seenIds.current.has(n.id));
    if (fresh.length === 0) return;

    for (const n of fresh) {
      seenIds.current.add(n.id);
      toast(n.title, {
        description: n.body,
        className:
          "!bg-yellow-400 !text-yellow-950 !border-yellow-500 [&_[data-description]]:!text-yellow-900",
        onClick: () => {
          if (n.documentId) {
            void navigate({
              to: "/documents",
              search: { focus: n.documentId },
            });
          } else {
            void navigate({ to: "/notifications" });
          }
        },
      });
    }

    void qc.invalidateQueries({ queryKey: documentsKey() });
    for (const n of fresh) {
      if (n.documentId) {
        void qc.invalidateQueries({ queryKey: ["document", n.documentId] });
      }
    }
    void qc.invalidateQueries({ queryKey: notificationsKey });
  }, [notifications, qc, navigate]);

  return null;
}
