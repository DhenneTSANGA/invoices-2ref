import { Prisma } from "@prisma/client";

/** Transforme une erreur Prisma en message utilisateur clair. */
export function formatPrismaError(err: unknown, fallback = "Erreur base de données"): string {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    const msg = err.message ?? "";
    if (msg.includes("DATABASE_URL") || msg.includes("Environment variable not found")) {
      return "Prisma n’est pas connecté : variable DATABASE_URL manquante sur le serveur (secrets de production).";
    }
    if (msg.includes("Can't reach database server") || msg.includes("P1001")) {
      return "Prisma n’arrive pas à joindre la base (hôte/port DATABASE_URL injoignable).";
    }
    return "Prisma n’a pas pu s’initialiser. Vérifiez DATABASE_URL et le redéploiement.";
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const fields = (err.meta?.target as string[] | undefined)?.join(", ");
        return fields
          ? `Conflit : une valeur existe déjà (${fields}).`
          : "Conflit : cet enregistrement existe déjà.";
      }
      case "P2003":
        return "Référence invalide (client ou prestation introuvable).";
      case "P2021": {
        const table = err.meta?.table as string | undefined;
        return table
          ? `Table manquante en base : « ${table} ». Appliquez la migration correspondante (ex. scripts/apply-letter-signature-requests.mjs).`
          : "Table manquante en base — migration non appliquée sur la base de production.";
      }
      case "P2022": {
        const col = err.meta?.column as string | undefined;
        return col
          ? `Colonne manquante en base : « ${col} ». Appliquez la migration (ex. scripts/apply-document-discount.mjs).`
          : "Schéma base de données incomplet — migration manquante.";
      }
      case "P2025":
        return "Enregistrement introuvable.";
      case "P2028":
        return `${fallback} : la transaction base de données a expiré ou a été interrompue (connexion lente ou pooler). Réessayez ; si ça continue, vérifiez que Supabase est joignable.`;
      default:
        return `${fallback} (${err.code}).`;
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    const msg = err.message;
    if (msg.includes("Unknown argument")) {
      return "Le client Prisma est désynchronisé du schéma. Redéployez l’application (prisma generate).";
    }
    return "Données invalides pour la base.";
  }
  if (err instanceof Error && err.message) {
    const msg = err.message;
    if (msg.includes(".prisma/client") || msg.includes("Cannot find module")) {
      return "Client Prisma non généré sur le serveur. Redéployez avec « prisma generate » au build.";
    }
    if (msg.includes("DATABASE_URL") || msg.includes("Environment variable not found")) {
      return "Prisma n’est pas connecté : variable DATABASE_URL manquante sur le serveur (secrets de production).";
    }
    return msg;
  }
  return fallback;
}

export function isPrismaColumnMissing(err: unknown, column: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2022" &&
    String(err.meta?.column ?? "").includes(column)
  );
}
