-- CreateTable
CREATE TABLE "public"."po_barcodes" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "poReference" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "barcodeValue" TEXT NOT NULL,
    "barcodeType" TEXT NOT NULL DEFAULT 'CODE128',
    "printedCount" INTEGER NOT NULL DEFAULT 0,
    "lastPrintedAt" TIMESTAMP(3),
    "lastPrintedBy" TEXT,
    "scannedCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "lastScannedBy" TEXT,
    "expectedItems" JSONB,
    "totalExpectedQty" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "po_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "po_barcodes_poId_key" ON "public"."po_barcodes"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "po_barcodes_barcodeValue_key" ON "public"."po_barcodes"("barcodeValue");

-- CreateIndex
CREATE INDEX "po_barcodes_poId_idx" ON "public"."po_barcodes"("poId");

-- CreateIndex
CREATE INDEX "po_barcodes_barcodeValue_idx" ON "public"."po_barcodes"("barcodeValue");

-- CreateIndex
CREATE INDEX "po_barcodes_status_idx" ON "public"."po_barcodes"("status");

-- CreateIndex
CREATE INDEX "product_variants_upc_idx" ON "public"."product_variants"("upc");

-- CreateIndex
CREATE INDEX "product_variants_barcode_idx" ON "public"."product_variants"("barcode");

-- AddForeignKey
ALTER TABLE "public"."po_barcodes" ADD CONSTRAINT "po_barcodes_lastPrintedBy_fkey" FOREIGN KEY ("lastPrintedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
