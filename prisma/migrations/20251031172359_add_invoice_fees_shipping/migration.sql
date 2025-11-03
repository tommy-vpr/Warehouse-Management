/*
  Warnings:

  - You are about to drop the column `barcode` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `barcode` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."invoice_items" DROP COLUMN "barcode",
ADD COLUMN     "barcodeValue" TEXT;

-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "barcode",
ADD COLUMN     "barcodeValue" TEXT,
ADD COLUMN     "fees" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shipping" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "invoice_items_barcodeValue_idx" ON "public"."invoice_items"("barcodeValue");

-- CreateIndex
CREATE INDEX "invoices_barcodeValue_idx" ON "public"."invoices"("barcodeValue");
