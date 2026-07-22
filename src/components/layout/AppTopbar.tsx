import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/common/Logo";
import { Bell, Moon, Search, Sun, Plus, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CommandPalette } from "./CommandPalette";
import { MobileNav } from "./MobileNav";
import { StaffAvatar } from "@/components/common/StaffAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { shortDate } from "@/lib/format";
import { useSession, useNotifications, useMarkNotificationRead } from "@/hooks/use-data";
import { signOut } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { sessionKey } from "@/hooks/use-data";
import type { NotificationItem } from "@/store/types";

export function AppTopbar() {
  const { theme, toggle } = useTheme();
  const { data: notifications = [] } = useNotifications();
  const markOneMutation = useMarkNotificationRead();
  const unreadList = notifications.filter((n) => !n.read);
  const unread = unreadList.length;
  const [openCmd, setOpenCmd] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: session } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const staff = session?.staff;
  const displayName = staff
    ? `${staff.firstName} ${staff.lastName}`
  : "Collaborateur";

  const logout = async () => {
    await signOut();
    qc.setQueryData(sessionKey, null);
    void navigate({ to: "/login" });
  };

  const openNotification = async (n: NotificationItem) => {
    setBellOpen(false);
    if (!n.read) {
      try {
        await markOneMutation.mutateAsync(n.id);
      } catch {
        // On navigue quand même
      }
    }
    if (n.documentId) {
      void navigate({
        to: "/documents",
        search: { focus: n.documentId },
      });
    } else {
      void navigate({ to: "/notifications" });
    }
  };

  return (
    <>
      <header className="glass-topbar sticky top-0 z-30 flex h-14 min-w-0 items-center gap-2 overflow-x-clip px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-6">
        <MobileNav />
        <Logo size="xs" className="hidden shrink-0 rounded-md sm:block lg:hidden" />

        <button
          onClick={() => setOpenCmd(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-surface/70 px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface sm:max-w-xl sm:px-3"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden truncate sm:inline">Rechercher clients, devis, factures…</span>
          <span className="truncate sm:hidden">Rechercher</span>
          <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono sm:inline-block">⌘K</kbd>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Link
            to="/invoices/new"
            className="hidden md:inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Nouvelle facture
          </Link>

          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface/70 text-foreground transition-colors hover:bg-muted"
            aria-label="Basculer le thème"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="relative">
            <button
              onClick={() => { setBellOpen(o => !o); setProfileOpen(false); }}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface/70 transition-colors hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-none text-white ring-2 ring-background shadow-md">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="glass-panel absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-2 shadow-float"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="text-sm font-semibold">Notifications</div>
                    <Link to="/notifications" className="text-xs text-primary hover:underline" onClick={() => setBellOpen(false)}>Tout voir</Link>
                  </div>
                  <ul className="max-h-96 overflow-y-auto">
                    {unreadList.length === 0 ? (
                      <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                        Aucune notification non lue
                      </li>
                    ) : (
                      unreadList.slice(0, 5).map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => void openNotification(n)}
                          className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/70"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.type === "success" ? "bg-success" : n.type === "warning" ? "bg-warning" : n.type === "danger" ? "bg-danger" : "bg-primary"}`}
                            />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{n.title}</div>
                              <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                              <div className="mt-0.5 text-[10px] text-muted-foreground">
                                {shortDate(n.at)}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                      ))
                    )}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => { setProfileOpen((o) => !o); setBellOpen(false); }}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface/70 pl-1 pr-2 py-1 transition-colors hover:bg-muted"
            >
              <StaffAvatar
                person={
                  staff ?? {
                    firstName: displayName,
                    lastName: "",
                  }
                }
                size="sm"
                className="!h-8 !w-8 !rounded-xl !text-sm"
              />
              <span className="hidden text-sm font-medium md:inline max-w-[140px] truncate">{displayName}</span>
              {staff?.role === "super_admin" && (
                <span className="hidden rounded-full bg-gradient-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground sm:inline">
                  SA
                </span>
              )}
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:inline" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="glass-panel absolute right-0 top-12 z-50 w-56 rounded-2xl p-2 shadow-float"
                >
                  <div className="px-3 py-2">
                    <div className="text-sm font-semibold">{displayName}</div>
                    <div className="text-xs text-muted-foreground">{staff?.jobTitle ?? ""}</div>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <Link to="/profile" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">Mon profil</Link>
                  <Link to="/settings" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">Paramètres</Link>
                  <button type="button" onClick={logout} className="w-full text-left rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger/10">Se déconnecter</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <CommandPalette open={openCmd} onOpenChange={setOpenCmd} />
    </>
  );
}
