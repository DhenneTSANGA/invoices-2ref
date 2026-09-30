import { Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { rememberSpace, type AppSpace } from "@/lib/app-space";

export function SpaceSwitcher({ current }: { current: AppSpace }) {
  return (
    <div className="flex items-center gap-0.5 rounded-2xl border border-border/60 bg-surface/70 p-1">
      <Link
        to="/dashboard"
        onClick={() => rememberSpace("facturation")}
        className={cn(
          "rounded-xl px-3 py-1.5 text-sm font-semibold transition",
          current === "facturation"
            ? "bg-gradient-primary text-primary-foreground shadow-glow"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        Facturation
      </Link>
      <Link
        to="/prospection"
        onClick={() => rememberSpace("prospection")}
        className={cn(
          "rounded-xl px-3 py-1.5 text-sm font-semibold transition",
          current === "prospection"
            ? "bg-gradient-primary text-primary-foreground shadow-glow"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        Prospection
      </Link>
      <Link
        to="/hub"
        title="Tous les espaces"
        className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LayoutGrid className="h-4 w-4" />
      </Link>
    </div>
  );
}
