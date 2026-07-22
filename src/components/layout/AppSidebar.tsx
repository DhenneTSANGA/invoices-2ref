import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";
import { useSession } from "@/hooks/use-data";
import { CABINET_LABELS } from "@/lib/cabinets";
import { canSwitchCabinet, isSuperAdmin, roleLabel } from "@/lib/roles";
import { primaryNav, secondaryNav, navForRole } from "./nav-items";
import { CabinetSwitcher } from "./CabinetSwitcher";

function selectPathname(s: { location: { pathname: string } }) {
  return s.location.pathname;
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: selectPathname });
  const { data: session } = useSession();
  const role = session?.staff.role ?? "member";
  const items = navForRole(primaryNav, role);
  const secondary = navForRole(secondaryNav, role);
  const cabinetLabel = session
    ? CABINET_LABELS[session.activeCabinet]
    : CABINET_LABELS.expertise_fiscale;
  const isSa = session ? isSuperAdmin(session.staff.role) : false;

  return (
    <motion.aside
      animate={{ width: collapsed ? 84 : 264 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="glass-sidebar sticky top-4 z-40 ml-4 my-4 hidden lg:flex h-[calc(100vh-2rem)] flex-col rounded-3xl p-3 shadow-float"
    >
      <div className="relative flex items-center px-3 py-3">
        {!isSa && (
          <div className="flex min-w-0 flex-1 justify-center">
            <Logo
              size="sm"
              className="rounded-lg"
              cabinet={session?.activeCabinet}
            />
          </div>
        )}
        {isSa && (
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            {collapsed ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary font-display text-sm font-bold text-primary-foreground shadow-glow">
                2R
              </div>
            ) : (
              <div className="min-w-0">
                <div className="font-display text-lg font-bold leading-none">2R</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  Multi-cabinets
                </div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute right-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Réduire"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {!collapsed && session && (
        <div className="mx-2 mb-3 space-y-3">
          <div
            className={cn(
              "rounded-2xl px-3.5 py-3",
              isSa
                ? "border border-primary/25 bg-primary/8"
                : "bg-muted/50",
            )}
          >
            {isSa ? (
              <>
                <div className="inline-flex items-center rounded-full bg-gradient-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
                  Super admin
                </div>
                <div className="mt-2 font-display text-sm font-semibold leading-snug">
                  {roleLabel(session.staff.role)}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  Accès aux deux cabinets
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-medium">{roleLabel(session.staff.role)}</div>
                <div className="text-muted-foreground text-[11px] truncate">{cabinetLabel}</div>
              </>
            )}
          </div>
          {canSwitchCabinet(session.staff.role) && (
            <div>
              <div className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cabinet actif
              </div>
              <CabinetSwitcher />
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex-1 overflow-y-auto pr-1">
        <NavSection title="Principal" items={items} pathname={pathname} collapsed={collapsed} />
        <div className="mx-3 my-3 h-px bg-border" />
        <NavSection title="Espace" items={secondary} pathname={pathname} collapsed={collapsed} />
      </div>
    </motion.aside>
  );
}

function NavSection({
  title, items, pathname, collapsed,
}: {
  title: string;
  items: { to: string; label: string; icon: typeof ChevronLeft }[];
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
