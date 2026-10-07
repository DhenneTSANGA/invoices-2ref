-- Prospection CRM: budget, objectifs, biblio, référentiels, checklist, notifications

CREATE TYPE "CrmExpenseCategory" AS ENUM ('evenements', 'relations', 'communication', 'deplacements', 'reserve');
CREATE TYPE "CrmExpenseApproval" AS ENUM ('none', 'pending', 'approved', 'rejected');
CREATE TYPE "CrmObjectiveMetric" AS ENUM ('qualifies', 'contacts', 'rdv', 'propositions', 'signatures');
CREATE TYPE "CrmLibraryDomain" AS ENUM ('rh', 'comptabilite', 'conseil', 'fiscalite', 'formation', 'audit', 'juridique');
CREATE TYPE "CrmReferentialKind" AS ENUM ('line', 'stage', 'site', 'expense', 'sector');

CREATE TABLE "crm_expenses" (
  "id" TEXT NOT NULL,
  "managerId" TEXT NOT NULL,
  "category" "CrmExpenseCategory" NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "at" DATE NOT NULL,
  "companyId" TEXT,
  "opportunityId" TEXT,
  "activityId" TEXT,
  "receipt" BOOLEAN NOT NULL DEFAULT false,
  "approval" "CrmExpenseApproval" NOT NULL DEFAULT 'none',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_expenses_managerId_idx" ON "crm_expenses"("managerId");
CREATE INDEX "crm_expenses_at_idx" ON "crm_expenses"("at");
CREATE INDEX "crm_expenses_approval_idx" ON "crm_expenses"("approval");
CREATE INDEX "crm_expenses_companyId_idx" ON "crm_expenses"("companyId");

ALTER TABLE "crm_expenses"
  ADD CONSTRAINT "crm_expenses_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "crm_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_expenses"
  ADD CONSTRAINT "crm_expenses_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_expenses"
  ADD CONSTRAINT "crm_expenses_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "crm_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "crm_objectives" (
  "id" TEXT NOT NULL,
  "managerId" TEXT NOT NULL,
  "metric" "CrmObjectiveMetric" NOT NULL,
  "target" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_objectives_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_objectives_managerId_metric_key" ON "crm_objectives"("managerId", "metric");
CREATE INDEX "crm_objectives_managerId_idx" ON "crm_objectives"("managerId");

CREATE TABLE "crm_library_items" (
  "id" TEXT NOT NULL,
  "line" "CrmLibraryDomain" NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "terms" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_library_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_library_items_line_idx" ON "crm_library_items"("line");
CREATE INDEX "crm_library_items_category_idx" ON "crm_library_items"("category");

CREATE TABLE "crm_referentials" (
  "id" TEXT NOT NULL,
  "kind" "CrmReferentialKind" NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_referentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_referentials_kind_idx" ON "crm_referentials"("kind");

CREATE TABLE "crm_week_checks" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_week_checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_week_checks_key_key" ON "crm_week_checks"("key");
CREATE INDEX "crm_week_checks_sortOrder_idx" ON "crm_week_checks"("sortOrder");

CREATE TABLE "crm_notifications" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "href" TEXT NOT NULL DEFAULT '/prospection',
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crm_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_notifications_read_at_idx" ON "crm_notifications"("read", "at");
CREATE INDEX "crm_notifications_at_idx" ON "crm_notifications"("at");
