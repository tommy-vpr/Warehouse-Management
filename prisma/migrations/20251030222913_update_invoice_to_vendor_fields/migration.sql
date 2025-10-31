/*
  Warnings:

  - You are about to drop the column `customerAddress` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `customerEmail` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `customerName` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `customerPhone` on the `invoices` table. All the data in the column will be lost.
  - Added the required column `vendorName` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."invoices_customerEmail_idx";

-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "customerAddress",
DROP COLUMN "customerEmail",
DROP COLUMN "customerName",
DROP COLUMN "customerPhone",
ADD COLUMN     "vendorAddress" TEXT,
ADD COLUMN     "vendorEmail" TEXT,
ADD COLUMN     "vendorName" TEXT NOT NULL,
ADD COLUMN     "vendorPhone" TEXT;

-- CreateIndex
CREATE INDEX "invoices_vendorName_idx" ON "public"."invoices"("vendorName");
