import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { CABINET_LABELS, CABINET_LOGOS, type Cabinet } from "@/lib/cabinets";
import { cn } from "@/lib/utils";

/** Étapes réelles du changement de cabinet, dans l’ordre d’exécution. */
export const CABINET_TRANSITION_STEPS = [
  "Session du cabinet",
  "Pipeline commercial",
  "Équipe et objectifs",
] as const;

type CabinetTransitionOverlayProps = {
  /** Transition en cours (null = overlay fermé). */
  transition: { from: Cabinet; to: Cabinet } | null;
  /** Index de l’étape en cours ; égal au nombre d’étapes une fois terminé. */
  step: number;
};

/**
 * Chargement propre à la Prospection lors d’un changement de cabinet : le logo de
 * départ « passe la main » au logo d’arrivée le long d’une piste, et chaque étape
 * se coche au fur et à mesure (distinct de l’overlay de la Facturation).
 */
export function CabinetTransitionOverlay({ transition, step }: CabinetTransitionOverlayProps) {
  const reduceMotion = useReducedMotion();
  if (typeof document === "undefined") return null;

  const total = CABINET_TRANSITION_STEPS.length;
  const progress = Math.min(step, total) / total;
  const done = step >= total;

  return createPortal(
    <AnimatePresence>
      {transition && (
        <motion.div
          key="crm-cabinet-transition"
          role="status"
          aria-live="polite"
          aria-busy={!done}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 px-4 backdrop-blur-md"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="glass-panel w-full max-w-md rounded-3xl px-6 py-7 shadow-float sm:px-8"
          >
            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Prospection · changement de cabinet
            </p>

            {/* Piste : cabinet de départ → cabinet d’arrivée */}
            <div className="mt-5 flex items-center gap-3">
              <CabinetBadge cabinet={transition.from} muted />
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-primary"
                  initial={{ width: "8%" }}
                  animate={{ width: `${Math.max(8, progress * 100)}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }}
                />
                {!done && !reduceMotion && (
                  <motion.div
                    aria-hidden
                    className="absolute inset-y-0 w-10 rounded-full bg-white/50 blur-[2px]"
                    initial={{ left: "-15%" }}
                    animate={{ left: "110%" }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
              <CabinetBadge cabinet={transition.to} highlighted={done} />
            </div>

            <p className="mt-5 text-center font-display text-lg font-semibold">
              {done ? "C’est prêt" : `Vers ${CABINET_LABELS[transition.to]}`}
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {done
                ? `Vous travaillez maintenant sur ${CABINET_LABELS[transition.to]}.`
                : "Les données de l’autre cabinet restent cloisonnées."}
            </p>

            <ol className="mt-5 space-y-2">
              {CABINET_TRANSITION_STEPS.map((label, i) => {
                const state = i < step ? "done" : i === step ? "active" : "todo";
                return (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                      state === "active" && "bg-primary/10 font-medium text-foreground",
                      state === "done" && "text-foreground",
                      state === "todo" && "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        state === "done" && "border-transparent bg-gradient-primary text-primary-foreground",
                        state === "active" && "border-primary text-primary",
                        state === "todo" && "border-border",
                      )}
                    >
                      {state === "done" ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : state === "active" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                    </span>
                    {label}
                  </li>
                );
              })}
            </ol>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function CabinetBadge({
  cabinet,
  muted,
  highlighted,
}: {
  cabinet: Cabinet;
  muted?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border bg-white p-1.5 shadow-sm transition-all duration-300",
          muted ? "border-border/60 opacity-60 grayscale" : "border-primary/40",
          highlighted && "shadow-glow ring-2 ring-primary/40",
        )}
      >
        <img
          src={CABINET_LOGOS[cabinet]}
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
      <span className="line-clamp-2 text-center text-[10px] leading-tight text-muted-foreground">
        {CABINET_LABELS[cabinet]}
      </span>
    </div>
  );
}
