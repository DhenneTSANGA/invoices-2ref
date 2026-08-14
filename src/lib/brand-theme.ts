/** Couleurs proposées dans Paramètres → Apparence. */
export const BRAND_COLOR_PRESETS = [
  "#1E40AF",
  "#01004C",
  "#0EA5E9",
  "#7C3AED",
  "#0D9488",
  "#DC2626",
] as const;

export const DEFAULT_PRIMARY_COLOR = BRAND_COLOR_PRESETS[0];

const THEME_PROPS = [
  "--primary",
  "--primary-foreground",
  "--primary-glow",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--gradient-primary",
  "--shadow-glow",
] as const;

function parseHex(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  return hex.toUpperCase();
}

function hexToRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function toHex(r: number, g: number, b: number) {
  const n = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${n(r)}${n(g)}${n(b)}`.toUpperCase();
}

function mix(hex: string, towardWhite: number) {
  const { r, g, b } = hexToRgb(hex);
  return toHex(
    r + (255 - r) * towardWhite,
    g + (255 - g) * towardWhite,
    b + (255 - b) * towardWhite,
  );
}

function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

export function normalizePrimaryColor(
  value: string | null | undefined,
): string | null {
  return parseHex(value);
}

/** Applique (ou retire) la couleur primaire sur les variables CSS de l’app. */
export function applyPrimaryColor(value: string | null | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const hex = parseHex(value);
  if (!hex) {
    for (const prop of THEME_PROPS) root.style.removeProperty(prop);
    return;
  }

  const glow = mix(hex, 0.38);
  const foreground = isLight(hex) ? "#0F172A" : "#FFFFFF";
  root.style.setProperty("--primary", hex);
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--primary-glow", glow);
  root.style.setProperty("--ring", glow);
  root.style.setProperty("--sidebar-primary", hex);
  root.style.setProperty("--sidebar-primary-foreground", foreground);
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, ${hex} 0%, ${glow} 100%)`,
  );
  root.style.setProperty(
    "--shadow-glow",
    `0 0 0 1px ${hex}33, 0 8px 28px ${hex}40`,
  );
}
