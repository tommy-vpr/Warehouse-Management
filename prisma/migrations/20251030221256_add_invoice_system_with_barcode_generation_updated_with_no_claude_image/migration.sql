/*
  Warnings:

  - You are about to drop the column `rawText` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `sourceType` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "rawText",
DROP COLUMN "sourceType",
DROP COLUMN "sourceUrl",
ADD COLUMN     "originalInvoiceUrl" TEXT;

-- DropEnum
DROP TYPE "public"."InvoiceSourceType";
