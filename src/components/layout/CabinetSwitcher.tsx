import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { CABINET_LABELS, CABINET_LOGOS, CABINETS, type Cabinet } from "@/lib/cabinets";
import { setActiveCabinet } from "@/lib/session.functions";
import {
  sessionKey,
  clientsKey,
  companyKey,
  servicesKey,
  allDocumentsKey,
  useSession,
} from "@/hooks/use-data";
import { LoadingOverlay } from "@/components/common/LoadingState";
import { cn } from "@/lib/utils";

export function CabinetSwitcher() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const [switchingTo, setSwitchingTo] = useState<Cabinet | null>(null);

  if (!session) return null;

  const switchTo = async (cabinet: Cabinet) => {
    if (cabinet === session.activeCabinet || switchingTo) return;
    setSwitchingTo(cabinet);
    try {
      await setActiveCabinet({ data: { cabinet } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: sessionKey }),
        qc.invalidateQueries({ queryKey: clientsKey }),
        qc.invalidateQueries({ queryKey: companyKey }),
        qc.invalidateQueries({ queryKey: servicesKey }),
        qc.invalidateQueries({ queryKey: allDocumentsKey }),
        qc.invalidateQueries({ queryKey: ["documents"] }),
      ]);
      await router.invalidate();
      toast.success(`Cabinet : ${CABINET_LABELS[cabinet]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Changement impossible");
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-2">
        {CABINETS.map((c) => {
          const active = session.activeCabinet === c;
          return (
            <button
              key={c}
              type="button"
              disabled={!!switchingTo}
              onClick={() => void switchTo(c)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition disabled:opacity-70",
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "border border-border/60 bg-surface/80 text-foreground hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl p-1",
                  active
                    ? "bg-white shadow-sm"
                    : "border border-border/50 bg-background",
                )}
              >
                <img
                  src={CABINET_LOGOS[c]}
                  alt={CABINET_LABELS[c]}
                  className="h-12 w-12 object-contain"
                />
              </span>
              <span className="min-w-0 text-xs font-semibold leading-snug">
                {CABINET_LABELS[c]}
              </span>
            </button>
          );
        })}
      </div>

      <LoadingOverlay
        open={!!switchingTo}
        title="Changement de cabinet"
        description={
          switchingTo
            ? `Passage à ${CABINET_LABELS[switchingTo]}…`
            : undefined
        }
        imageSrc={switchingTo ? CABINET_LOGOS[switchingTo] : undefined}
        imageAlt={switchingTo ? CABINET_LABELS[switchingTo] : ""}
      />
    </>
  );
}
