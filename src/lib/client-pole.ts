export const CLIENT_POLES = [
  "formation",
  "audit",
  "juridique",
  "comptabilite",
] as const;

export type ClientPole = (typeof CLIENT_POLES)[number];

export const DEFAULT_CLIENT_POLE: ClientPole = "formation";

export const CLIENT_POLE_LABELS: Record<ClientPole, string> = {
  formation: "Formation",
  audit: "Audit",
  juridique: "Juridique",
  comptabilite: "Comptabilité",
};

export const CLIENT_POLE_HINTS: Record<ClientPole, string> = {
  formation: "Sessions, intra-entreprise, séminaires.",
  audit: "Missions d’audit et de contrôle.",
  juridique: "Conseil et suivi juridique.",
  comptabilite: "Tenue, déclarations, expert-comptable.",
};

export function isClientPole(value: unknown): value is ClientPole {
  return (
    typeof value === "string" &&
    (CLIENT_POLES as readonly string[]).includes(value)
  );
}

export function parseClientPole(value: unknown): ClientPole {
  return isClientPole(value) ? value : DEFAULT_CLIENT_POLE;
}

export function clientPoleLabel(value: unknown): string {
  return CLIENT_POLE_LABELS[parseClientPole(value)];
}
