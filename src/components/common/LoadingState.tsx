import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  title?: string;
  description?: string;
  /** Icône thématique (le spinner reste affiché en dessous). */
  icon?: LucideIcon;
  className?: string;
  /** "page" = zone principale ; "inline" = bloc compact dans une carte */
  variant?: "page" | "inline";
};

/** État de chargement visible dans le contenu (listes, fiches, etc.). */
export function LoadingState({
  title = "Chargement",
  description = "Un instant, nous préparons vos données…",
  icon: Icon,
  className,
  variant = "page",
}: LoadingStateProps) {
  const isInline = variant === "inline";

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "glass-panel flex flex-col items-center justify-center text-center",
        isInline
          ? "rounded-2xl px-6 py-10"
          : "rounded-3xl px-8 py-16 sm:py-20",
        className,
      )}
    >
      <div className="relative">
        <div
          className="absolute inset-0 -z-10 rounded-full bg-gradient-primary opacity-20 blur-2xl"
          aria-hidden
        />
        <div
          className={cn(
            "flex items-center justify-center rounded-3xl bg-gradient-primary text-primary-foreground shadow-glow",
            isInline ? "h-14 w-14" : "h-16 w-16",
          )}
        >
          {Icon ? (
            <Icon className={cn(isInline ? "h-6 w-6" : "h-7 w-7")} />
          ) : (
            <Loader2
              className={cn("animate-spin", isInline ? "h-6 w-6" : "h-7 w-7")}
            />
          )}
        </div>
      </div>

      {Icon && (
        <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
      )}

      <p
        className={cn(
          "font-display font-semibold",
          isInline ? "text-base" : "text-lg",
          Icon ? "mt-2" : "mt-5",
        )}
      >
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          {description}
        </p>
      )}

      <div className="mt-5 flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

type LoadingOverlayProps = {
  open: boolean;
  title?: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
};

/** Overlay plein écran (ex. changement de cabinet, action bloquante). */
export function LoadingOverlay({
  open,
  title = "Chargement",
  description,
  imageSrc,
  imageAlt = "",
}: LoadingOverlayProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="loading-overlay"
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
            {imageSrc ? (
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white p-2 shadow-sm">
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className="h-16 w-16 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            )}
            {imageSrc && (
              <Loader2 className="mt-5 h-6 w-6 animate-spin text-primary" />
            )}
            <p className="mt-4 font-display text-lg font-semibold">{title}</p>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
