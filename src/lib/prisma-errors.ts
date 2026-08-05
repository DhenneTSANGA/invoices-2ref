import { Prisma } from "@prisma/client";

/** Transforme une erreur Prisma en message utilisateur clair. */
export function formatPrismaError(err: unknown, fallback = "Erreur base de données"): string {
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
      case "P2022": {
        const col = err.meta?.column as string | undefined;
        return col
          ? `Colonne manquante en base : « ${col} ». Appliquez la migration (ex. scripts/apply-document-discount.mjs).`
          : "Schéma base de données incomplet — migration manquante.";
      }
      case "P2025":
        return "Enregistrement introuvable.";
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
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isPrismaColumnMissing(err: unknown, column: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2022" &&
    String(err.meta?.column ?? "").includes(column)
  );
}
