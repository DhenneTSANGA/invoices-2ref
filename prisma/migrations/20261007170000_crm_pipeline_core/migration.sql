-- Prospection CRM: tables cœur (entreprises, contacts, pistes, opportunités, activités)

CREATE TYPE "CrmCompanyKind" AS ENUM ('prospect', 'client');
CREATE TYPE "CrmSite" AS ENUM ('libreville', 'port_gentil', 'franceville');
CREATE TYPE "CrmServiceLine" AS ENUM ('rh', 'comptabilite', 'conseil', 'fiscalite', 'formation');
CREATE TYPE "CrmOpportunitySource" AS ENUM ('nouveau', 'client_existant', 'client_formation', 'piste_interne');
CREATE TYPE "CrmPipelineStage" AS ENUM (
  'qualification',
  'premier_contact',
  'rendez_vous',
  'proposition',
  'negotiation',
  'decision',
  'gagne',
  'perdu',
  'reporte'
);
CREATE TYPE "CrmActivityKind" AS ENUM ('appel', 'email', 'visite', 'rdv', 'evenement');
CREATE TYPE "CrmActivityStatus" AS ENUM (
  'a_faire',
  'planifiee',
  'en_cours',
  'terminee',
  'annulee',
  'en_retard'
);
CREATE TYPE "CrmLeadStatus" AS ENUM (
  'nouvelle',
  'en_cours',
  'qualifiee',
  'convertie',
  'rejetee',
  'reportee'
);
CREATE TYPE "CrmContactInfluence" AS ENUM ('faible', 'moyen', 'fort');

CREATE TABLE "crm_companies" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "name" TEXT NOT NULL,
  "kind" "CrmCompanyKind" NOT NULL DEFAULT 'prospect',
  "sector" TEXT NOT NULL DEFAULT '',
  "size" TEXT NOT NULL DEFAULT '',
  "site" "CrmSite" NOT NULL DEFAULT 'libreville',
  "address" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "website" TEXT NOT NULL DEFAULT '',
  "managerId" TEXT NOT NULL DEFAULT '',
  "servicesBought" "CrmServiceLine"[] DEFAULT ARRAY[]::"CrmServiceLine"[],
  "targetLines" "CrmServiceLine"[] DEFAULT ARRAY[]::"CrmServiceLine"[],
  "source" "CrmOpportunitySource" NOT NULL DEFAULT 'nouveau',
  "strategic" BOOLEAN NOT NULL DEFAULT false,
  "caSigned" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "notes" TEXT NOT NULL DEFAULT '',
  "plan" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_companies_clientId_key" ON "crm_companies"("clientId");
CREATE INDEX "crm_companies_name_idx" ON "crm_companies"("name");
CREATE INDEX "crm_companies_kind_idx" ON "crm_companies"("kind");
CREATE INDEX "crm_companies_site_idx" ON "crm_companies"("site");
CREATE INDEX "crm_companies_managerId_idx" ON "crm_companies"("managerId");
CREATE INDEX "crm_companies_createdById_idx" ON "crm_companies"("createdById");

ALTER TABLE "crm_companies"
  ADD CONSTRAINT "crm_companies_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_companies"
  ADD CONSTRAINT "crm_companies_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "crm_contacts" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "decisionMaker" BOOLEAN NOT NULL DEFAULT false,
  "influence" "CrmContactInfluence" NOT NULL DEFAULT 'moyen',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_contacts_companyId_idx" ON "crm_contacts"("companyId");
CREATE INDEX "crm_contacts_lastName_idx" ON "crm_contacts"("lastName");

ALTER TABLE "crm_contacts"
  ADD CONSTRAINT "crm_contacts_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "crm_leads" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "companyId" TEXT,
  "line" "CrmServiceLine" NOT NULL,
  "need" TEXT NOT NULL,
  "comment" TEXT NOT NULL DEFAULT '',
  "ownerId" TEXT NOT NULL,
  "author" TEXT NOT NULL DEFAULT '',
  "status" "CrmLeadStatus" NOT NULL DEFAULT 'nouvelle',
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_leads_status_idx" ON "crm_leads"("status");
CREATE INDEX "crm_leads_ownerId_idx" ON "crm_leads"("ownerId");
CREATE INDEX "crm_leads_companyId_idx" ON "crm_leads"("companyId");
CREATE INDEX "crm_leads_at_idx" ON "crm_leads"("at");

ALTER TABLE "crm_leads"
  ADD CONSTRAINT "crm_leads_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "crm_opportunities" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "leadId" TEXT,
  "title" TEXT NOT NULL,
  "line" "CrmServiceLine" NOT NULL,
  "source" "CrmOpportunitySource" NOT NULL,
  "stage" "CrmPipelineStage" NOT NULL DEFAULT 'qualification',
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "probability" INTEGER NOT NULL DEFAULT 20,
  "decisionOn" DATE,
  "nextAction" TEXT NOT NULL DEFAULT '',
  "nextActionOn" DATE,
  "ownerId" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "lostReason" TEXT,
  "reviveOn" DATE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_opportunities_leadId_key" ON "crm_opportunities"("leadId");
CREATE INDEX "crm_opportunities_companyId_idx" ON "crm_opportunities"("companyId");
CREATE INDEX "crm_opportunities_stage_idx" ON "crm_opportunities"("stage");
CREATE INDEX "crm_opportunities_ownerId_idx" ON "crm_opportunities"("ownerId");
CREATE INDEX "crm_opportunities_nextActionOn_idx" ON "crm_opportunities"("nextActionOn");

ALTER TABLE "crm_opportunities"
  ADD CONSTRAINT "crm_opportunities_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_opportunities"
  ADD CONSTRAINT "crm_opportunities_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "crm_activities" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "opportunityId" TEXT,
  "at" DATE NOT NULL,
  "time" TEXT,
  "kind" "CrmActivityKind" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "nextAction" TEXT,
  "nextActionOn" DATE,
  "ownerId" TEXT NOT NULL,
  "status" "CrmActivityStatus" NOT NULL DEFAULT 'terminee',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_activities_companyId_idx" ON "crm_activities"("companyId");
CREATE INDEX "crm_activities_opportunityId_idx" ON "crm_activities"("opportunityId");
CREATE INDEX "crm_activities_at_idx" ON "crm_activities"("at");
CREATE INDEX "crm_activities_ownerId_idx" ON "crm_activities"("ownerId");
CREATE INDEX "crm_activities_status_idx" ON "crm_activities"("status");

ALTER TABLE "crm_activities"
  ADD CONSTRAINT "crm_activities_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "crm_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "crm_activities"
  ADD CONSTRAINT "crm_activities_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
