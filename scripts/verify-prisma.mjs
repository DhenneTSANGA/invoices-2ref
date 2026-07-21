import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const counts = await Promise.all([
  prisma.company.count(),
  prisma.client.count(),
  prisma.service.count(),
  prisma.document.count(),
  prisma.staffMember.count(),
]);

console.log(
  "Prisma OK — company/clients/services/documents/staff:",
  counts.join("/"),
);

await prisma.$disconnect();
