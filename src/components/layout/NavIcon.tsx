import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Micro-animations style Resend au survol du lien parent (`group`). */
export type NavIconMotion =
  | "ring"
  | "wiggle"
  | "bounce"
  | "spin"
  | "tilt"
  | "pulse"
  | "shake"
  | "lift";

type Props = {
  icon: LucideIcon;
  motion?: NavIconMotion;
  className?: string;
};

export function NavIcon({ icon: Icon, motion = "tilt", className }: Props) {
  return (
    <Icon
      aria-hidden
      className={cn(
        "relative h-4.5 w-4.5 shrink-0 origin-center",
        `nav-icon-${motion}`,
        className,
      )}
    />
  );
}
