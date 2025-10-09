-- CreateEnum
CREATE TYPE "public"."BackOrderStatus" AS ENUM ('PENDING', 'RESTOCK_REQUESTED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."BackOrderReason" AS ENUM ('OUT_OF_STOCK', 'SHORT_PICK', 'DAMAGED_PRODUCT', 'LOCATION_EMPTY', 'RESERVED_ELSEWHERE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."OrderStatus" ADD VALUE 'PARTIALLY_PICKED';
ALTER TYPE "public"."OrderStatus" ADD VALUE 'PARTIALLY_SHIPPED';
ALTER TYPE "public"."OrderStatus" ADD VALUE 'BACKORDER';

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "hasBackOrders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "partialShipments" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."back_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantityBackOrdered" INTEGER NOT NULL,
    "quantityFulfilled" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."BackOrderStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "public"."BackOrderReason" NOT NULL,
    "reasonDetails" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "originalPickListId" TEXT,
    "originalPickListItemId" TEXT,
    "originalOrderDate" TIMESTAMP(3) NOT NULL,
    "estimatedRestockDate" TIMESTAMP(3),
    "actualRestockDate" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "customerNotified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "back_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."back_order_fulfillments" (
    "id" TEXT NOT NULL,
    "backOrderId" TEXT NOT NULL,
    "quantityFilled" INTEGER NOT NULL,
    "pickListId" TEXT,
    "userId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "back_order_fulfillments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "back_orders_status_idx" ON "public"."back_orders"("status");

-- CreateIndex
CREATE INDEX "back_orders_productVariantId_status_idx" ON "public"."back_orders"("productVariantId", "status");

-- CreateIndex
CREATE INDEX "back_orders_estimatedRestockDate_idx" ON "public"."back_orders"("estimatedRestockDate");

-- CreateIndex
CREATE UNIQUE INDEX "back_orders_orderId_productVariantId_key" ON "public"."back_orders"("orderId", "productVariantId");

-- AddForeignKey
ALTER TABLE "public"."back_orders" ADD CONSTRAINT "back_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."back_orders" ADD CONSTRAINT "back_orders_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."back_order_fulfillments" ADD CONSTRAINT "back_order_fulfillments_backOrderId_fkey" FOREIGN KEY ("backOrderId") REFERENCES "public"."back_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
