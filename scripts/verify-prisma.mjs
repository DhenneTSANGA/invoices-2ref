import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const counts = await Promise.all([
  prisma.company.count(),
  prisma.client.count(),
  prisma.service.count(),
  prisma.document.count(),
  prisma.documentLine.count(),
  prisma.activity.count(),
  prisma.notification.count(),
  prisma.staffMember.count(),
]);

console.log(
  "Prisma OK — companies/clients/services/documents/lines/activities/notifications/staff:",
  counts.join("/"),
);

await prisma.$disconnect();
