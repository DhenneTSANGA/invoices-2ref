import { Link } from "@tanstack/react-router";
import { FileText, LayoutGrid, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { rememberSpace, type AppSpace } from "@/lib/app-space";

export function SpaceSwitcher({ current }: { current: AppSpace }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-2xl border border-border/60 bg-surface/70 p-0.5 sm:p-1">
      <Link
        to="/dashboard"
        onClick={() => rememberSpace("facturation")}
        aria-label="Facturation"
        title="Facturation"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold transition sm:h-auto sm:w-auto sm:px-3 sm:py-1.5",
          current === "facturation"
            ? "bg-gradient-primary text-primary-foreground shadow-glow"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <FileText className="h-4 w-4 sm:hidden" />
        <span className="hidden sm:inline">Facturation</span>
      </Link>
      <Link
        to="/prospection"
        onClick={() => rememberSpace("prospection")}
        aria-label="Prospection"
        title="Prospection"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold transition sm:h-auto sm:w-auto sm:px-3 sm:py-1.5",
          current === "prospection"
            ? "bg-gradient-primary text-primary-foreground shadow-glow"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Target className="h-4 w-4 sm:hidden" />
        <span className="hidden sm:inline">Prospection</span>
      </Link>
      <Link
        to="/hub"
        title="Tous les espaces"
        aria-label="Tous les espaces"
        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground sm:h-auto sm:w-auto sm:p-1.5"
      >
        <LayoutGrid className="h-4 w-4" />
      </Link>
    </div>
  );
}
