-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'check', 'bank_transfer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod";
