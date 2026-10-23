import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";

/**
 * Bouton « remonter en haut », en bas à droite : apparaît sur une page longue
 * quand l’utilisateur approche du bas de la page (Facturation et Prospection).
 */
export function ScrollToTopButton() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      // Page longue (plus d’un écran et demi) et dernier quart de page atteint.
      const long = doc.scrollHeight > window.innerHeight * 1.5;
      setVisible(long && y > 400 && y >= max * 0.75);
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const r = 21;
  const circ = 2 * Math.PI * r;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="scroll-top"
          type="button"
          aria-label="Remonter en haut de la page"
          title="Remonter en haut"
          onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          whileHover={reduceMotion ? undefined : { y: -3 }}
          whileTap={{ scale: 0.92 }}
          className="group fixed bottom-6 right-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow outline-none ring-offset-2 ring-offset-background transition-shadow hover:shadow-float focus-visible:ring-2 focus-visible:ring-primary md:bottom-8 md:right-8"
        >
          {/* Anneau de progression du défilement. */}
          <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
            <circle cx="24" cy="24" r={r} fill="none" strokeWidth="2.5" className="stroke-white/25" />
            <circle
              cx="24"
              cy="24"
              r={r}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              className="stroke-white transition-[stroke-dashoffset] duration-150"
            />
          </svg>
          <ArrowUp className="relative h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
