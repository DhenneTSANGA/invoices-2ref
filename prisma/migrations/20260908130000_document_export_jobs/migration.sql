-- CreateEnum
CREATE TYPE "DocumentExportStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "DocumentExportFormat" AS ENUM ('zip', 'csv', 'both');

-- CreateTable
CREATE TABLE "document_export_jobs" (
    "id" TEXT NOT NULL,
    "cabinet" "Cabinet" NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "DocumentExportStatus" NOT NULL DEFAULT 'pending',
    "format" "DocumentExportFormat" NOT NULL,
    "documentType" "DocumentType",
    "clientId" TEXT,
    "months" INTEGER NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "zipUrl" TEXT,
    "zipPath" TEXT,
    "csvUrl" TEXT,
    "csvPath" TEXT,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_export_jobs_cabinet_createdAt_idx" ON "document_export_jobs"("cabinet", "createdAt");

-- CreateIndex
CREATE INDEX "document_export_jobs_createdById_createdAt_idx" ON "document_export_jobs"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "document_export_jobs_status_idx" ON "document_export_jobs"("status");

-- AddForeignKey
ALTER TABLE "document_export_jobs" ADD CONSTRAINT "document_export_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_export_jobs" ADD CONSTRAINT "document_export_jobs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
