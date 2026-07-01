import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel flex flex-col items-center justify-center rounded-3xl px-8 py-16 text-center"
    >
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-primary blur-2xl opacity-25" aria-hidden />
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-10 w-10" />
        </div>
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
