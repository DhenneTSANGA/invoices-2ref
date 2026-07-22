import { useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
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

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {switchingTo && (
              <motion.div
                key="cabinet-switch-overlay"
                role="status"
                aria-live="polite"
                aria-busy="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="glass-panel mx-6 flex w-full max-w-sm flex-col items-center rounded-3xl px-8 py-10 text-center shadow-float"
                >
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white p-2 shadow-sm">
                    <img
                      src={CABINET_LOGOS[switchingTo]}
                      alt=""
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                  <Loader2 className="mt-5 h-6 w-6 animate-spin text-primary" />
                  <p className="mt-4 font-display text-lg font-semibold">
                    Changement de cabinet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Passage à {CABINET_LABELS[switchingTo]}…
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
