import { useEffect, useRef, type RefObject } from "react";

/**
 * Ferme un panneau au clic (ou touch) en dehors des nœuds référencés.
 */
export function useClickOutside(
  refs: Array<RefObject<HTMLElement | null>>,
  onOutside: () => void,
  enabled: boolean,
) {
  const refsRef = useRef(refs);
  const onOutsideRef = useRef(onOutside);
  refsRef.current = refs;
  onOutsideRef.current = onOutside;

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (refsRef.current.some((ref) => ref.current?.contains(target))) return;
      onOutsideRef.current();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [enabled]);
}
