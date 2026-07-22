import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageHeader({
  title, subtitle, actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-bold tracking-tight break-words sm:text-3xl md:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground break-words">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
