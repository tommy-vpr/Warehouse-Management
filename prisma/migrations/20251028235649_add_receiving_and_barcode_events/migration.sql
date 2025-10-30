-- CreateEnum
CREATE TYPE "public"."POBarcodeEventType" AS ENUM ('LABEL_PRINTED', 'LABEL_REPRINTED', 'LABEL_VOIDED', 'LABEL_SCANNED', 'SESSION_STARTED', 'SESSION_COMPLETED');

-- CreateTable
CREATE TABLE "public"."po_barcode_events" (
    "id" TEXT NOT NULL,
    "barcodeId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "eventType" "public"."POBarcodeEventType" NOT NULL,
    "userId" TEXT,
    "quantity" INTEGER DEFAULT 1,
    "source" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "po_barcode_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."receiving_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productId" TEXT,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "receiving_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "po_barcode_events_poId_idx" ON "public"."po_barcode_events"("poId");

-- CreateIndex
CREATE INDEX "po_barcode_events_barcodeId_idx" ON "public"."po_barcode_events"("barcodeId");

-- CreateIndex
CREATE INDEX "receiving_events_sessionId_idx" ON "public"."receiving_events"("sessionId");

-- CreateIndex
CREATE INDEX "receiving_events_sku_idx" ON "public"."receiving_events"("sku");

-- AddForeignKey
ALTER TABLE "public"."po_barcode_events" ADD CONSTRAINT "po_barcode_events_barcodeId_fkey" FOREIGN KEY ("barcodeId") REFERENCES "public"."po_barcodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."po_barcode_events" ADD CONSTRAINT "po_barcode_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."receiving_events" ADD CONSTRAINT "receiving_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."receiving_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."receiving_events" ADD CONSTRAINT "receiving_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
