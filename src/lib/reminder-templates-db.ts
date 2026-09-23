import type { Cabinet } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  parseReminderTemplates,
  type ReminderTemplates,
} from "@/lib/reminder-templates";

export async function persistReminderTemplates(
  cabinet: Cabinet,
  templates: ReminderTemplates,
) {
  const json = JSON.stringify(parseReminderTemplates(templates));
  await prisma.$executeRawUnsafe(
    `UPDATE "companies" SET "reminderTemplates" = $1::jsonb WHERE cabinet = $2::"Cabinet"`,
    json,
    cabinet,
  );
}

export async function loadReminderTemplates(
  cabinet: Cabinet,
): Promise<ReminderTemplates> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ reminderTemplates: unknown }>
    >(
      `SELECT "reminderTemplates" FROM "companies" WHERE cabinet = $1::"Cabinet" LIMIT 1`,
      cabinet,
    );
    return parseReminderTemplates(rows[0]?.reminderTemplates);
  } catch {
    return parseReminderTemplates(null);
  }
}
