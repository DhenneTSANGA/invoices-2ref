import { cn } from "@/lib/utils";

export const LOGO_SRC = "/logo-2ref.png";

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
};

export function Logo({
  size = "sm",
  className,
  alt = "2REF Conseil Fiscal",
}: LogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={cn("w-auto shrink-0 object-contain", sizeClass[size], className)}
    />
  );
}
