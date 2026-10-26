import type { Document } from "@/store/types";

/** Plus récent d’abord : date d’émission, puis date de création, puis numéro. */
export function compareDocumentsNewestFirst(
  a: Pick<Document, "issueDate" | "createdAt" | "number">,
  b: Pick<Document, "issueDate" | "createdAt" | "number">,
): number {
  const byIssue = b.issueDate.localeCompare(a.issueDate);
  if (byIssue !== 0) return byIssue;
  const byCreated = (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  if (byCreated !== 0) return byCreated;
  return b.number.localeCompare(a.number, "fr", { numeric: true });
}

export function sortDocumentsNewestFirst<T extends Document>(docs: readonly T[]): T[] {
  return [...docs].sort(compareDocumentsNewestFirst);
}

/** orderBy Prisma équivalent (serveur). */
export const DOCUMENT_NEWEST_FIRST = [
  { issueDate: "desc" as const },
  { createdAt: "desc" as const },
  { number: "desc" as const },
];
