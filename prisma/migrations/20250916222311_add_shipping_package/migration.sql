-- CreateTable
CREATE TABLE "public"."ShippingPackage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrierCode" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "labelUrl" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "weight" DECIMAL(8,2),
    "dimensions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingPackage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ShippingPackage" ADD CONSTRAINT "ShippingPackage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
