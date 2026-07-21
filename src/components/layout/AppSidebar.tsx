import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, FileText, ReceiptText, Package,
  Files, Archive, Settings, Bell, Search, UserCircle2, ChevronLeft, FileSignature, Mail, FolderOpen,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";

const items = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/services", label: "Catalogue", icon: Package },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/quotations", label: "Devis", icon: FileText },
  { to: "/invoices", label: "Factures", icon: ReceiptText },
  { to: "/proformas", label: "Pro forma", icon: FileSignature },
  { to: "/lettre", label: "Lettres", icon: Mail },
  { to: "/templates", label: "Modèles", icon: Files },
  { to: "/archive", label: "Archives", icon: Archive },
] as const;

const secondary = [
  { to: "/search", label: "Recherche", icon: Search },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profil", icon: UserCircle2 },
  { to: "/settings", label: "Paramètres", icon: Settings },
] as const;

function selectPathname(s: { location: { pathname: string } }) {
  return s.location.pathname;
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: selectPathname });

  return (
    <motion.aside
      animate={{ width: collapsed ? 84 : 264 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="glass-sidebar sticky top-4 z-40 ml-4 my-4 hidden lg:flex h-[calc(100vh-2rem)] flex-col rounded-3xl p-3 shadow-float"
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <Logo size="sm" className="rounded-lg" />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-display text-lg font-bold leading-none">2REF-AUTO</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Expertise Fiscale</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Réduire"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto pr-1">
        <NavSection title="Principal" items={items} pathname={pathname} collapsed={collapsed} />
        <div className="mx-3 my-3 h-px bg-border" />
        <NavSection title="Espace" items={secondary} pathname={pathname} collapsed={collapsed} />
      </div>

      <div className={cn(
        "mt-2 rounded-2xl border border-border/60 p-3",
        collapsed ? "px-2" : "bg-gradient-primary text-primary-foreground shadow-glow border-transparent",
      )}>
        {!collapsed ? (
          <div>
            <div className="text-xs font-medium opacity-90">Plan Entreprise</div>
            <div className="mt-1 text-sm font-semibold">Cabinet illimité</div>
            <button className="mt-3 w-full rounded-xl bg-white/15 px-3 py-2 text-xs font-medium backdrop-blur transition-colors hover:bg-white/25">
              Gérer l'abonnement
            </button>
          </div>
        ) : (
          <div className="flex justify-center text-primary">
            <UserCircle2 className="h-6 w-6" />
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function NavSection({
  title, items, pathname, collapsed,
}: {
  title: string;
  items: readonly { to: string; label: string; icon: typeof LayoutDashboard }[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div>
      {!collapsed && <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>}
      <ul className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                preload="intent"
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  active ? "text-primary-foreground" : "text-foreground/80 hover:text-foreground hover:bg-muted/70",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-2xl bg-gradient-primary shadow-glow"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className={cn("relative h-4.5 w-4.5 shrink-0", active && "drop-shadow")} />
                {!collapsed && <span className="relative truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
