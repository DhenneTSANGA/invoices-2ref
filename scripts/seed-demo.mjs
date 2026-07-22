import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_EF = {
  cabinet: "expertise_fiscale",
  name: "2R EXPERTISE FISCALE",
  tagline: "SARL au capital de 10 000 000 F CFA — Conseil Fiscal",
  nif: "202601003286 Z",
  niu: "—",
  rccm: "GALBV LBV 2026 B12 B1200162",
  cnss: null,
  address: "BP 20 478, Cité Bas de Gué-Gué",
  city: "Libreville, Gabon",
  phone: "011 44 39 64 / 065 10 99 10",
  email: "expertise.fiscale@2ref.ga",
  website: "www.2ref.ga",
  bankName: null,
  bankAccount: null,
};

const COMPANY_CONSEIL = {
  cabinet: "conseil",
  name: "2R CONSEIL",
  tagline: "Cabinet de conseil",
  nif: "—",
  niu: "—",
  rccm: "—",
  cnss: null,
  address: "Libreville",
  city: "Libreville, Gabon",
  phone: "",
  email: "conseil@2ref.ga",
  website: "www.2ref.ga",
  bankName: null,
  bankAccount: null,
};

for (const data of [COMPANY_EF, COMPANY_CONSEIL]) {
  await prisma.company.upsert({
    where: { cabinet: data.cabinet },
    create: data,
    update: data,
  });
  console.log(`Company OK — ${data.name}`);
}

const services = [
  {
    code: "COMPTA-M",
    name: "Tenue de comptabilité mensuelle",
    description: "Saisie, rapprochements bancaires et états mensuels",
    unit: "mois",
    unitPrice: 350000,
    vatRate: 18,
    category: "Comptabilité",
  },
  {
    code: "FISC-ANN",
    name: "Déclaration fiscale annuelle",
    description: "Préparation et dépôt des déclarations fiscales",
    unit: "dossier",
    unitPrice: 850000,
    vatRate: 18,
    category: "Fiscalité",
  },
  {
    code: "AUDIT",
    name: "Mission d'audit contractuel",
    description: "Audit des comptes et rapport d'audit",
    unit: "mission",
    unitPrice: 2500000,
    vatRate: 18,
    category: "Audit",
  },
];

for (const cabinet of ["expertise_fiscale", "conseil"]) {
  for (const s of services) {
    await prisma.service.upsert({
      where: { cabinet_code: { cabinet, code: s.code } },
      create: { ...s, cabinet },
      update: s,
    });
  }
}

console.log(`Seed OK — ${services.length * 2} services, 2 cabinets`);
await prisma.$disconnect();
