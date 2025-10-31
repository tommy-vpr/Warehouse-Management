-- CreateEnum
CREATE TYPE "public"."InvoiceSourceType" AS ENUM ('IMAGE', 'PASTE');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "barcode" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerPhone" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "sourceType" "public"."InvoiceSourceType" NOT NULL,
    "sourceUrl" TEXT,
    "rawText" TEXT,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "productVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "public"."invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "public"."invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_customerEmail_idx" ON "public"."invoices"("customerEmail");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_orderId_idx" ON "public"."invoices"("orderId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "public"."invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_items_sku_idx" ON "public"."invoice_items"("sku");

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
