-- AlterTable
ALTER TABLE "public"."order_items" ADD COLUMN     "shopifyFulfillmentOrderLineItemId" TEXT,
ADD COLUMN     "shopifyLineItemId" TEXT;

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "shopifyFulfillmentIds" TEXT,
ADD COLUMN     "shopifyLineItems" JSONB;

-- CreateTable
CREATE TABLE "public"."shopify_syncs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "error" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopify_syncs_orderId_idx" ON "public"."shopify_syncs"("orderId");

-- CreateIndex
CREATE INDEX "shopify_syncs_status_syncType_idx" ON "public"."shopify_syncs"("status", "syncType");

-- AddForeignKey
ALTER TABLE "public"."shopify_syncs" ADD CONSTRAINT "shopify_syncs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
