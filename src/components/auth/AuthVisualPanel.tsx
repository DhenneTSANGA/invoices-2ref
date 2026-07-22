import { DualCabinetLogos } from "@/components/common/Logo";

type AuthVisualPanelProps = {
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: string;
};

/** Panneau image plein écran (desktop) pour login / signup. */
export function AuthVisualPanel({
  imageSrc,
  imageAlt,
  title,
  subtitle,
}: AuthVisualPanelProps) {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden lg:block">
      <img
        src={imageSrc}
        alt={imageAlt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/35"
      />
      <div className="relative flex h-full min-h-screen flex-col justify-between p-10 xl:p-12">
        <DualCabinetLogos
          size="sm"
          className="gap-3 [&_img]:h-11 [&_img]:rounded-md [&_img]:bg-white/95 [&_img]:p-1"
        />
        <div>
          <h1 className="font-display max-w-md text-3xl font-bold leading-tight text-white xl:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 xl:text-base">
            {subtitle}
          </p>
          <p className="mt-8 text-xs text-white/50">
            © {new Date().getFullYear()} 2R Conseil & 2R Expertise Fiscale
          </p>
        </div>
      </div>
    </aside>
  );
}
