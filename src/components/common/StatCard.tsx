import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import { cn } from "@/lib/utils";

type Variant = "default" | "primary" | "accent" | "success" | "danger";

const variants: Record<Variant, { tile: string; icon: string }> = {
  default: { tile: "bg-surface-2 text-foreground", icon: "bg-primary/10 text-primary" },
  primary: { tile: "bg-gradient-primary text-primary-foreground", icon: "bg-white/15 text-white" },
  accent: { tile: "bg-gradient-accent text-accent-foreground", icon: "bg-black/10 text-accent-foreground" },
  success: { tile: "bg-gradient-success text-success-foreground", icon: "bg-white/15 text-white" },
  danger: { tile: "bg-gradient-danger text-danger-foreground", icon: "bg-white/15 text-white" },
};

export function StatCard({
  label, value, delta, icon: Icon, variant = "default", suffix, prefix, format, index = 0,
}: {
  label: string;
  value: number;
  delta?: { value: number; direction: "up" | "down" };
  icon: LucideIcon;
  variant?: Variant;
  suffix?: string;
  prefix?: string;
  format?: (n: number) => string;
  index?: number;
}) {
  const v = variants[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.015 }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 shadow-float",
        variant === "default" ? "glass-panel" : v.tile,
      )}
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between">
        <div>
          <p className={cn("text-xs font-medium uppercase tracking-wider", variant === "default" ? "text-muted-foreground" : "opacity-80")}>{label}</p>
          <div className="mt-3 flex items-baseline gap-1 font-display text-3xl font-bold tracking-tight">
            {prefix && <span className="text-base opacity-70">{prefix}</span>}
            <AnimatedCounter value={value} format={format} />
            {suffix && <span className="text-base opacity-70">{suffix}</span>}
          </div>
          {delta && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                delta.direction === "up"
                  ? (variant === "default" ? "bg-success/15 text-success" : "bg-white/20")
                  : (variant === "default" ? "bg-danger/15 text-danger" : "bg-black/15"),
              )}>
                {delta.direction === "up" ? "↑" : "↓"} {delta.value}%
              </span>
              <span className={variant === "default" ? "text-muted-foreground" : "opacity-70"}>vs mois dernier</span>
            </div>
          )}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", v.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  );
}
