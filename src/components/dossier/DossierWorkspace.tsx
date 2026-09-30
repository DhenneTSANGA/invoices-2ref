import { Link, useRouterState } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDossierDemoStore } from "@/store/useDossierDemoStore";

const LINKS = [
  { to: "/dossiers", label: "Dossiers fiscaux" },
  { to: "/ged", label: "GED" },
  { to: "/missions", label: "Missions" },
] as const;

export function DossierWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reset = useDossierDemoStore((s) => s.reset);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong>Espace dossier client</strong> — données fictives, hors
          facturation. Rien n’est enregistré en base.
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

      <div className="mb-5 flex flex-wrap gap-2">
        {LINKS.map((item) => {
          const active =
            pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "border border-border bg-surface/80 hover:bg-muted",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
