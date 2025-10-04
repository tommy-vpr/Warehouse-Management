-- CreateTable
CREATE TABLE "public"."ForecastSuggestion" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT,
    "vendorId" TEXT,
    "warehouseId" TEXT,
    "currentStock" INTEGER,
    "forecast30Days" INTEGER,
    "forecast60Days" INTEGER,
    "forecast90Days" INTEGER,
    "daysOfStock" INTEGER,
    "safetyStock" INTEGER,
    "leadTimeDays" INTEGER,
    "reorderPoint" TIMESTAMP(3),
    "recommendedQty" INTEGER,
    "unitCost" DOUBLE PRECISION,
    "currency" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForecastSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryPlannerPurchaseOrder" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "reference" TEXT,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "currency" TEXT,
    "totalValue" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryPlannerPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryPlannerPOLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT,
    "qtyOrdered" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,

    CONSTRAINT "InventoryPlannerPOLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "count" INTEGER,
    "error" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForecastSuggestion_sku_warehouseId_idx" ON "public"."ForecastSuggestion"("sku", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryPlannerPurchaseOrder_poId_key" ON "public"."InventoryPlannerPurchaseOrder"("poId");

-- CreateIndex
CREATE INDEX "InventoryPlannerPOLine_sku_idx" ON "public"."InventoryPlannerPOLine"("sku");

-- AddForeignKey
ALTER TABLE "public"."InventoryPlannerPOLine" ADD CONSTRAINT "InventoryPlannerPOLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."InventoryPlannerPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
