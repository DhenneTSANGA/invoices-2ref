import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Logo } from "@/components/common/Logo";
import { useSession } from "@/hooks/use-data";
import { primaryNav, secondaryNav, navForRole } from "./nav-items";
import { CabinetSwitcher } from "./CabinetSwitcher";
import { canSwitchCabinet, isSuperAdmin } from "@/lib/roles";
import { CABINET_LABELS } from "@/lib/cabinets";

function selectPathname(s: { location: { pathname: string } }) {
  return s.location.pathname;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: selectPathname });
  const { data: session } = useSession();
  const role = session?.staff.role ?? "member";
  const main = navForRole(primaryNav, role);
  const secondary = navForRole(secondaryNav, role);
  const isSa = session ? isSuperAdmin(session.staff.role) : false;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-surface/70 text-foreground transition-colors hover:bg-muted"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <SheetContent
        side="left"
        className="flex w-[min(100%,20rem)] flex-col gap-0 border-border/60 bg-background/95 p-0 backdrop-blur-xl"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-5 text-left">
          <div className="flex items-center justify-center gap-3">
            {isSa ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary font-display text-sm font-bold text-primary-foreground shadow-glow">
                2R
              </div>
            ) : (
              <Logo size="sm" cabinet={session?.activeCabinet} className="rounded-lg" />
            )}
            {isSa && (
              <div className="min-w-0">
                <SheetTitle className="font-display text-lg font-bold leading-none">
                  2R
                </SheetTitle>
                <SheetDescription className="mt-1 text-[10px] uppercase tracking-wider">
                  Multi-cabinets
                </SheetDescription>
              </div>
            )}
            {!isSa && (
              <SheetTitle className="sr-only">
                {session
                  ? CABINET_LABELS[session.activeCabinet]
                  : CABINET_LABELS.expertise_fiscale}
              </SheetTitle>
            )}
          </div>
          {isSa && (
            <div className="mt-3 inline-flex w-fit items-center rounded-full bg-gradient-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">
              Super admin
            </div>
          )}
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {session && canSwitchCabinet(session.staff.role) && (
            <div className="mb-4 px-1">
              <CabinetSwitcher />
            </div>
          )}
          <MobileSection title="Principal" items={main} pathname={pathname} onNavigate={() => setOpen(false)} />
          <div className="mx-2 my-4 h-px bg-border" />
          <MobileSection title="Espace" items={secondary} pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: readonly { to: string; label: string; icon: (typeof primaryNav)[number]["icon"] }[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                preload="intent"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-foreground/85 hover:bg-muted",
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
