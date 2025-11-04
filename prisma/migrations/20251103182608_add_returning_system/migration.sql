-- CreateEnum
CREATE TYPE "public"."ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'INSPECTION_COMPLETE', 'RESTOCKING', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReturnReason" AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'NO_LONGER_NEEDED', 'ORDERED_BY_MISTAKE', 'BETTER_PRICE', 'DAMAGED_SHIPPING', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RefundMethod" AS ENUM ('ORIGINAL_PAYMENT', 'STORE_CREDIT', 'REPLACEMENT', 'NO_REFUND');

-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReturnItemStatus" AS ENUM ('PENDING', 'RECEIVED', 'INSPECTED', 'RESTOCKED', 'DISPOSED', 'VENDOR_RETURN', 'QUARANTINE');

-- CreateEnum
CREATE TYPE "public"."ReturnCondition" AS ENUM ('NEW_UNOPENED', 'NEW_OPENED', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR', 'DEFECTIVE', 'DAMAGED', 'EXPIRED', 'MISSING_PARTS');

-- CreateEnum
CREATE TYPE "public"."ReturnDisposition" AS ENUM ('RESTOCK', 'DISPOSE', 'REPAIR', 'VENDOR_RETURN', 'DONATE', 'QUARANTINE', 'LIQUIDATE');

-- CreateEnum
CREATE TYPE "public"."ReturnEventType" AS ENUM ('RMA_CREATED', 'RMA_APPROVED', 'RMA_REJECTED', 'PACKAGE_SHIPPED', 'PACKAGE_RECEIVED', 'INSPECTION_STARTED', 'ITEM_INSPECTED', 'INSPECTION_COMPLETED', 'ITEM_RESTOCKED', 'ITEM_DISPOSED', 'REFUND_INITIATED', 'REFUND_COMPLETED', 'REFUND_FAILED', 'SHOPIFY_SYNCED', 'NOTE_ADDED', 'STATUS_CHANGED');

-- CreateTable
CREATE TABLE "public"."return_orders" (
    "id" TEXT NOT NULL,
    "rmaNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "status" "public"."ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "public"."ReturnReason" NOT NULL,
    "reasonDetails" TEXT,
    "refundMethod" "public"."RefundMethod" NOT NULL DEFAULT 'ORIGINAL_PAYMENT',
    "refundAmount" DECIMAL(10,2),
    "refundStatus" "public"."RefundStatus" NOT NULL DEFAULT 'PENDING',
    "restockingFee" DECIMAL(10,2),
    "returnTrackingNumber" TEXT,
    "returnCarrier" TEXT,
    "customerShippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "inspectedBy" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "shopifyRefundId" TEXT,
    "shopifySyncStatus" TEXT DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."return_items" (
    "id" TEXT NOT NULL,
    "returnOrderId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantityRequested" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "quantityRestockable" INTEGER NOT NULL DEFAULT 0,
    "quantityDisposed" INTEGER NOT NULL DEFAULT 0,
    "orderItemId" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "status" "public"."ReturnItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."return_inspections" (
    "id" TEXT NOT NULL,
    "returnOrderId" TEXT NOT NULL,
    "returnItemId" TEXT NOT NULL,
    "condition" "public"."ReturnCondition" NOT NULL,
    "conditionNotes" TEXT,
    "disposition" "public"."ReturnDisposition" NOT NULL,
    "dispositionNotes" TEXT,
    "restockLocationId" TEXT,
    "inspectedBy" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoUrls" TEXT[],

    CONSTRAINT "return_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."return_events" (
    "id" TEXT NOT NULL,
    "returnOrderId" TEXT NOT NULL,
    "eventType" "public"."ReturnEventType" NOT NULL,
    "userId" TEXT,
    "data" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "return_orders_rmaNumber_key" ON "public"."return_orders"("rmaNumber");

-- CreateIndex
CREATE INDEX "return_orders_orderId_idx" ON "public"."return_orders"("orderId");

-- CreateIndex
CREATE INDEX "return_orders_status_idx" ON "public"."return_orders"("status");

-- CreateIndex
CREATE INDEX "return_orders_customerEmail_idx" ON "public"."return_orders"("customerEmail");

-- CreateIndex
CREATE INDEX "return_orders_rmaNumber_idx" ON "public"."return_orders"("rmaNumber");

-- CreateIndex
CREATE INDEX "return_items_returnOrderId_idx" ON "public"."return_items"("returnOrderId");

-- CreateIndex
CREATE INDEX "return_items_productVariantId_idx" ON "public"."return_items"("productVariantId");

-- CreateIndex
CREATE INDEX "return_inspections_returnOrderId_idx" ON "public"."return_inspections"("returnOrderId");

-- CreateIndex
CREATE INDEX "return_inspections_returnItemId_idx" ON "public"."return_inspections"("returnItemId");

-- CreateIndex
CREATE INDEX "return_events_returnOrderId_idx" ON "public"."return_events"("returnOrderId");

-- AddForeignKey
ALTER TABLE "public"."return_orders" ADD CONSTRAINT "return_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_orders" ADD CONSTRAINT "return_orders_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_orders" ADD CONSTRAINT "return_orders_inspectedBy_fkey" FOREIGN KEY ("inspectedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_orders" ADD CONSTRAINT "return_orders_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_items" ADD CONSTRAINT "return_items_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "public"."return_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_items" ADD CONSTRAINT "return_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_inspections" ADD CONSTRAINT "return_inspections_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "public"."return_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_inspections" ADD CONSTRAINT "return_inspections_returnItemId_fkey" FOREIGN KEY ("returnItemId") REFERENCES "public"."return_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_inspections" ADD CONSTRAINT "return_inspections_restockLocationId_fkey" FOREIGN KEY ("restockLocationId") REFERENCES "public"."locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_inspections" ADD CONSTRAINT "return_inspections_inspectedBy_fkey" FOREIGN KEY ("inspectedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_events" ADD CONSTRAINT "return_events_returnOrderId_fkey" FOREIGN KEY ("returnOrderId") REFERENCES "public"."return_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."return_events" ADD CONSTRAINT "return_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
