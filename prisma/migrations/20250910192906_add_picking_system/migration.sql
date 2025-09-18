-- CreateEnum
CREATE TYPE "public"."PickStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PickItemStatus" AS ENUM ('PENDING', 'PICKED', 'SHORT_PICK', 'SKIPPED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "public"."PickEventType" AS ENUM ('PICK_STARTED', 'PICK_PAUSED', 'PICK_RESUMED', 'ITEM_PICKED', 'ITEM_SHORT_PICKED', 'ITEM_SKIPPED', 'LOCATION_SCANNED', 'BARCODE_SCANNED', 'PICK_COMPLETED', 'PICK_CANCELLED', 'ERROR_OCCURRED');

-- CreateTable
CREATE TABLE "public"."pick_lists" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "status" "public"."PickStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL,
    "pickedItems" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pick_list_items" (
    "id" TEXT NOT NULL,
    "pickListId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantityToPick" INTEGER NOT NULL,
    "quantityPicked" INTEGER NOT NULL DEFAULT 0,
    "pickSequence" INTEGER NOT NULL,
    "status" "public"."PickItemStatus" NOT NULL DEFAULT 'PENDING',
    "pickedAt" TIMESTAMP(3),
    "pickedBy" TEXT,
    "shortPickReason" TEXT,
    "notes" TEXT,

    CONSTRAINT "pick_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pick_events" (
    "id" TEXT NOT NULL,
    "pickListId" TEXT NOT NULL,
    "itemId" TEXT,
    "eventType" "public"."PickEventType" NOT NULL,
    "userId" TEXT NOT NULL,
    "location" TEXT,
    "scannedCode" TEXT,
    "data" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pick_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pick_lists_batchNumber_key" ON "public"."pick_lists"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "pick_list_items_pickListId_orderId_productVariantId_locatio_key" ON "public"."pick_list_items"("pickListId", "orderId", "productVariantId", "locationId");

-- AddForeignKey
ALTER TABLE "public"."pick_lists" ADD CONSTRAINT "pick_lists_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_list_items" ADD CONSTRAINT "pick_list_items_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "public"."pick_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_list_items" ADD CONSTRAINT "pick_list_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_list_items" ADD CONSTRAINT "pick_list_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_list_items" ADD CONSTRAINT "pick_list_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_list_items" ADD CONSTRAINT "pick_list_items_pickedBy_fkey" FOREIGN KEY ("pickedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_events" ADD CONSTRAINT "pick_events_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "public"."pick_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_events" ADD CONSTRAINT "pick_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
