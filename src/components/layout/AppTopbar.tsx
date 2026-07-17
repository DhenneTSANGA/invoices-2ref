import { Link } from "@tanstack/react-router";
import { Bell, Moon, Search, Sun, Plus, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAppStore } from "@/store/useAppStore";
import { CommandPalette } from "./CommandPalette";
import { MobileNav } from "./MobileNav";
import { motion, AnimatePresence } from "framer-motion";
import { shortDate } from "@/lib/format";

export function AppTopbar() {
  const { theme, toggle } = useTheme();
  const notifications = useAppStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;
  const [openCmd, setOpenCmd] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header className="glass-topbar sticky top-0 z-30 flex h-16 items-center gap-3 px-4 md:px-6">
        <MobileNav />

        <button
          onClick={() => setOpenCmd(true)}
          className="flex flex-1 items-center gap-2 rounded-2xl border border-border/60 bg-surface/70 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface max-w-xl"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Rechercher clients, devis, factures…</span>
          <span className="sm:hidden">Rechercher</span>
          <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono sm:inline-block">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
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
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-danger px-1 text-[10px] font-bold text-danger-foreground shadow">{unread}</span>
              )}
            </button>
            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="glass-panel absolute right-0 top-12 z-50 w-80 rounded-2xl p-2 shadow-float"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="text-sm font-semibold">Notifications</div>
                    <Link to="/notifications" className="text-xs text-primary hover:underline" onClick={() => setBellOpen(false)}>Tout voir</Link>
                  </div>
                  <ul className="max-h-96 overflow-y-auto">
                    {notifications.slice(0, 5).map((n) => (
                      <li key={n.id} className="rounded-xl px-3 py-2 hover:bg-muted/70 transition-colors">
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.type === "success" ? "bg-success" : n.type === "warning" ? "bg-warning" : n.type === "danger" ? "bg-danger" : "bg-primary"}`} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{n.title}</div>
                            <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">{shortDate(n.at)}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => { setProfileOpen(o => !o); setBellOpen(false); }}
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface/70 pl-1 pr-2 py-1 transition-colors hover:bg-muted"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground font-bold text-sm">DT</div>
              <span className="hidden text-sm font-medium md:inline">Dhenne TSANGA.</span>
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
                    <div className="text-sm font-semibold">Dhenne TSANGA</div>
                    <div className="text-xs text-muted-foreground">Expert-comptable</div>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <Link to="/profile" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">Mon profil</Link>
                  <Link to="/settings" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-muted">Paramètres</Link>
                  <Link to="/login" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger/10">Se déconnecter</Link>
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
