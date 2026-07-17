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
import { primaryNav, secondaryNav } from "./nav-items";

function selectPathname(s: { location: { pathname: string } }) {
  return s.location.pathname;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: selectPathname });

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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground font-display text-lg font-bold shadow-glow">
              2
            </div>
            <div>
              <SheetTitle className="font-display text-lg font-bold leading-none">2REF</SheetTitle>
              <SheetDescription className="mt-1 text-[10px] uppercase tracking-wider">
                Expertise Fiscale
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <MobileSection title="Principal" items={primaryNav} pathname={pathname} onNavigate={() => setOpen(false)} />
          <div className="mx-2 my-4 h-px bg-border" />
          <MobileSection title="Espace" items={secondaryNav} pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>

        <div className="border-t border-border/60 p-4">
          <div className="rounded-2xl bg-gradient-primary p-3 text-primary-foreground shadow-glow">
            <div className="text-xs font-medium opacity-90">Plan Entreprise</div>
            <div className="mt-0.5 text-sm font-semibold">Cabinet illimité</div>
          </div>
        </div>
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
