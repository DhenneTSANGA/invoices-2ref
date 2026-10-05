import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  LayoutGrid,
  Menu,
  Moon,
  RotateCcw,
  Shield,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";
import { SpaceSwitcher } from "@/components/layout/SpaceSwitcher";
import { StaffAvatar } from "@/components/common/StaffAvatar";
import { useTheme } from "@/components/theme/ThemeProvider";
import { signOut } from "@/lib/auth";
import { sessionKey } from "@/hooks/use-data";
import { useQueryClient } from "@tanstack/react-query";
import { useProspectionDemoStore } from "@/store/useProspectionDemoStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandTheme } from "@/components/layout/BrandTheme";
import { NavIcon } from "@/components/layout/NavIcon";
import { PageTransition } from "@/components/common/PageTransition";
import { isAdmin, isSuperAdmin, roleLabel } from "@/lib/roles";
import { crmRoleFromStaff } from "@/lib/prospection-access";
import { crmNavSections, type CrmNavItem } from "@/components/prospection/prospection-nav";

function selectPathname(s: { location: { pathname: string } }) {
  return s.location.pathname;
}

export function ProspectionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-clip">
      <BrandTheme />
      <ProspectionSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProspectionTopbar />
        <main className="min-w-0 flex-1 overflow-x-clip px-3 py-5 sm:px-4 sm:py-6 md:px-8">
          <DemoBanner />
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

function DemoBanner() {
  const reset = useProspectionDemoStore((s) => s.reset);
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <p>
        <strong>Espace prospection</strong> — données fictives, hors facturation.
        Rien n’est enregistré en base.
      </p>
      <button
        type="button"
        onClick={() => {
          reset();
          toast.success("Démo réinitialisée");
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300/70 bg-white/70 px-3 py-1.5 text-xs font-medium hover:bg-white dark:border-amber-800 dark:bg-amber-900/50"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Réinitialiser
      </button>
    </div>
  );
}

function ProspectionSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: selectPathname });
  const { session } = useRouteContext({ from: "/prospection" });
  const isSa = isSuperAdmin(session.staff.role);
  const adminLike = isAdmin(session.staff.role) && !isSa;
  const sections = crmNavSections(crmRoleFromStaff(session.staff.role));

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 84 : 264 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="glass-sidebar sticky top-4 z-40 ml-4 my-4 hidden h-[calc(100vh-2rem)] flex-col rounded-3xl p-3 shadow-float lg:flex"
    >
      <div className="relative flex items-center px-3 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden pr-8">
          {collapsed ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-primary font-display text-[10px] font-bold text-primary-foreground shadow-glow">
              2R
            </div>
          ) : (
            <div className="min-w-0">
              <div className="font-display text-lg font-bold leading-none">2R Hub</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                Prospection
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="absolute right-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Réduire"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {!collapsed && (
        <div className="mx-2 mb-3">
          {isSa ? (
            <div className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-3">
              <div className="inline-flex items-center rounded-full bg-gradient-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
                Super admin
              </div>
              <div className="mt-2 font-display text-sm font-semibold leading-snug">
                {roleLabel(session.staff.role)}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                CRM commercial · démo
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-2xl border px-3 py-2.5",
                adminLike
                  ? "border-primary/20 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent"
                  : "border-border/60 bg-muted/40",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    adminLike
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {roleLabel(session.staff.role)}
                  </div>
                  <div className="mt-1 truncate text-[11px] font-medium text-foreground/80">
                    Prospection
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex-1 overflow-y-auto pr-1">
        <Link
          to="/hub"
          className={cn(
            "mb-3 flex items-center gap-3 rounded-2xl border border-border/60 px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted/70 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Changer d’espace</span>}
        </Link>
        {sections.map((section, i) => (
          <div key={section.id} className={cn(i > 0 && "mt-4")}>
            {!collapsed ? (
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </div>
            ) : null}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <ProspectionNavLink
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.aside>
  );
}

function ProspectionTopbar() {
  const { theme, toggle, ready } = useTheme();
  const { session } = useRouteContext({ from: "/prospection" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const staff = session.staff;
  const displayName = `${staff.firstName} ${staff.lastName}`.trim() || "Collaborateur";

  const logout = async () => {
    await signOut();
    qc.setQueryData(sessionKey, null);
    void navigate({ to: "/login" });
  };

  return (
    <header className="glass-topbar sticky top-0 z-30 flex h-14 min-w-0 items-center gap-1.5 overflow-x-clip px-2 sm:h-[4.5rem] sm:gap-3 sm:px-4 md:px-6">
      <MobileProspectionNav />
      <Logo size="nav" className="hidden shrink-0 rounded-md sm:block lg:hidden" />
      <SpaceSwitcher current="prospection" />
      <Link
        to="/prospection/notifications"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-surface/70 hover:bg-muted sm:h-10 sm:w-10"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Link>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-surface/70 text-foreground transition-colors hover:bg-muted sm:h-10 sm:w-10"
          aria-label="Basculer le thème"
        >
          {!ready || theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex shrink-0 items-center gap-2 rounded-2xl border border-border/60 bg-surface/70 py-1 pl-1 pr-1.5 transition-colors hover:bg-muted sm:pr-2"
          >
            <StaffAvatar person={staff} size="sm" className="!h-8 !w-8 !rounded-xl !text-sm" />
            <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">
              {displayName}
            </span>
            {staff.role === "super_admin" && (
              <span className="hidden rounded-full bg-gradient-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground sm:inline">
                SA
              </span>
            )}
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:inline" />
          </button>
          {open ? (
            <div className="glass-panel absolute right-0 top-12 z-50 w-56 rounded-2xl p-2 shadow-float">
              <Link
                to="/hub"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm hover:bg-muted"
              >
                Changer d’espace
              </Link>
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
              >
                Se déconnecter
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function isNavActive(pathname: string, to: string) {
  return to === "/prospection"
    ? pathname === "/prospection"
    : pathname === to || pathname.startsWith(`${to}/`);
}

function ProspectionNavLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: CrmNavItem;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const active = isNavActive(pathname, item.to);
  return (
    <li>
      <Link
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
          active
            ? "text-primary-foreground"
            : "text-foreground/80 hover:bg-muted/70 hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        {active ? (
          <motion.span
            layoutId="prospection-nav-active"
            className="absolute inset-0 rounded-2xl bg-gradient-primary shadow-glow"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        ) : null}
        <NavIcon
          icon={item.icon}
          motion={item.iconMotion}
          className={cn("relative z-[1]", active && "drop-shadow")}
        />
        {!collapsed ? <span className="relative z-[1] truncate">{item.label}</span> : null}
      </Link>
    </li>
  );
}

function MobileProspectionNav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: selectPathname });
  const { session } = useRouteContext({ from: "/prospection" });
  const sections = crmNavSections(crmRoleFromStaff(session.staff.role));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-surface/70 text-foreground transition-colors hover:bg-muted sm:h-10 sm:w-10 lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <SheetContent
        side="left"
        className="flex w-[min(100%,20rem)] flex-col gap-0 border-border/60 bg-background/95 p-0 backdrop-blur-xl"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-5 text-left">
          <SheetTitle className="font-display text-lg font-bold">Prospection</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section, i) => (
            <div key={section.id} className={cn(i > 0 && "mt-4")}>
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <ProspectionNavLink
                    key={item.to}
                    item={item}
                    pathname={pathname}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
