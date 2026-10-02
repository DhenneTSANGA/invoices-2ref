import { useEffect, useRef } from "react";

/** Durée d’affichage de la surbrillance, alignée sur l’animation CSS `.crm-spotlight`. */
const SPOTLIGHT_MS = 3200;

export function readFocusSearch(search: Record<string, unknown>): { focus?: string } {
  const focus = search.focus;
  if (typeof focus === "string" && focus.length > 0) return { focus };
  return {};
}

/**
 * Fait défiler jusqu’à l’élément `[data-spotlight="<id>"]`, puis retire le paramètre
 * d’URL une fois la surbrillance terminée.
 */
export function useSpotlight(id: string | undefined, onDone?: () => void) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let attempts = 0;
    let frame = 0;

    const scrollToTarget = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-spotlight="${CSS.escape(id)}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      attempts += 1;
      if (attempts < 40) frame = window.requestAnimationFrame(scrollToTarget);
    };

    const start = window.setTimeout(scrollToTarget, 280);
    const done = window.setTimeout(() => {
      if (!cancelled) onDoneRef.current?.();
    }, SPOTLIGHT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearTimeout(done);
      window.cancelAnimationFrame(frame);
    };
  }, [id]);
}
