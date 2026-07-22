import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  documentsKey,
  notificationsKey,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-data";
import {
  loadToastedNotificationIds,
  rememberToastedNotificationIds,
} from "@/lib/notification-toast-state";

/** Polling + toasts quand un autre collaborateur met à jour un document. */
export function NotificationSync() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [], isSuccess } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const toastedIds = useRef(loadToastedNotificationIds());
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!isSuccess) return;

    // Premier chargement réussi : ne pas re-toaster les notifs déjà présentes
    if (!bootstrapped.current) {
      rememberToastedNotificationIds(
        toastedIds.current,
        notifications.map((n) => n.id),
      );
      bootstrapped.current = true;
      return;
    }

    const fresh = notifications.filter((n) => !toastedIds.current.has(n.id));
    if (fresh.length === 0) return;

    rememberToastedNotificationIds(
      toastedIds.current,
      fresh.map((n) => n.id),
    );

    for (const n of fresh) {
      toast(n.title, {
        description: n.body,
        className:
          "!bg-yellow-400 !text-yellow-950 !border-yellow-500 [&_[data-description]]:!text-yellow-900",
        action: {
          label: "Voir",
          onClick: () => {
            if (!n.read) markRead(n.id);
            if (n.documentId) {
              void navigate({
                to: "/documents",
                search: { focus: n.documentId },
              });
            } else {
              void navigate({ to: "/notifications" });
            }
          },
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
  }, [notifications, isSuccess, qc, navigate, markRead]);

  return null;
}
