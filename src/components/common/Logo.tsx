import { cn } from "@/lib/utils";
import { CABINET_LOGOS, type Cabinet } from "@/lib/cabinets";

export const LOGO_SRC = "/logo-2ref.png";
export const LOGO_CONSEIL_SRC = "/logo-2r-conseil.png";

const sizeClass = {
  xs: "h-8",
  sm: "h-10",
  md: "h-12",
  lg: "h-16",
  xl: "h-20",
  doc: "h-14",
} as const;

type LogoProps = {
  size?: keyof typeof sizeClass;
  className?: string;
  alt?: string;
  cabinet?: Cabinet;
};

export function Logo({
  size = "sm",
  className,
  alt,
  cabinet = "expertise_fiscale",
}: LogoProps) {
  const src = CABINET_LOGOS[cabinet] ?? LOGO_SRC;
  return (
    <img
      src={src}
      alt={alt ?? (cabinet === "conseil" ? "2R Conseil" : "2R Expertise Fiscale")}
      className={cn("w-auto shrink-0 object-contain", sizeClass[size], className)}
    />
  );
}

/** Paire de logos (Expertise + Conseil) pour la sidebar super admin. */
export function DualCabinetLogos({
  size = "sm",
  className,
  activeCabinet,
}: {
  size?: keyof typeof sizeClass;
  className?: string;
  activeCabinet?: Cabinet;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <img
        src={CABINET_LOGOS.expertise_fiscale}
        alt="2R Expertise Fiscale"
        className={cn(
          "w-auto object-contain transition",
          sizeClass[size],
          activeCabinet && activeCabinet !== "expertise_fiscale" && "opacity-45",
        )}
      />
      <img
        src={CABINET_LOGOS.conseil}
        alt="2R Conseil"
        className={cn(
          "w-auto object-contain transition",
          sizeClass[size],
          activeCabinet && activeCabinet !== "conseil" && "opacity-45",
        )}
      />
    </div>
  );
}
