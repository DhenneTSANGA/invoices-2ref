import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CABINETS, CABINET_LABELS, type Cabinet } from "@/lib/cabinets";
import { setActiveCabinet } from "@/lib/session.functions";
import { sessionKey } from "@/hooks/use-data";
import { prospectionClientsKey } from "@/hooks/use-prospection-companies";
import { useProspectionStore } from "@/store/useProspectionStore";
import { cn } from "@/lib/utils";

/**
 * Choix du cabinet dans l’espace Prospection — super admins uniquement, comme en
 * Facturation. Le cabinet actif est partagé entre les deux espaces ; les autres
 * collaborateurs restent sur le leur sans voir ce sélecteur.
 */
export function ProspectionCabinetSwitcher({ className }: { className?: string }) {
  const { session } = useRouteContext({ from: "/prospection" });
  const qc = useQueryClient();
  const router = useRouter();
  const reloadPipeline = useProspectionStore((s) => s.reloadPipeline);
  const [switchingTo, setSwitchingTo] = useState<Cabinet | null>(null);

  if (session.staff.role !== "super_admin") return null;

  const switchTo = async (cabinet: Cabinet) => {
    if (cabinet === session.activeCabinet || switchingTo) return;
    setSwitchingTo(cabinet);
    try {
      await setActiveCabinet({ data: { cabinet } });
      await qc.invalidateQueries({ queryKey: sessionKey });
      // Nouveau contexte de session (cabinet actif), puis données du cabinet choisi.
      await router.invalidate();
      await Promise.all([
        reloadPipeline(),
        qc.invalidateQueries({ queryKey: prospectionClientsKey }),
        qc.invalidateQueries({ queryKey: ["crm-team-pulse"] }),
        qc.invalidateQueries({ queryKey: ["crm-team-trend"] }),
      ]);
      toast.success(`Cabinet : ${CABINET_LABELS[cabinet]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Changement impossible");
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Cabinet
      </div>
      <div role="radiogroup" aria-label="Cabinet actif" className="grid grid-cols-1 gap-1.5">
        {CABINETS.map((c) => {
          const active = session.activeCabinet === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={Boolean(switchingTo)}
              onClick={() => void switchTo(c)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition disabled:opacity-70",
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "border border-border/60 bg-surface/80 text-foreground hover:bg-muted",
              )}
            >
              <span className="truncate">{CABINET_LABELS[c]}</span>
              {switchingTo === c ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
