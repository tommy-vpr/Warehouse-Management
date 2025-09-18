/*
  Warnings:

  - You are about to drop the `ShippingPackage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ShippingPackage" DROP CONSTRAINT "ShippingPackage_orderId_fkey";

-- DropTable
DROP TABLE "public"."ShippingPackage";

-- CreateTable
CREATE TABLE "public"."shipping_packages" (
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

    CONSTRAINT "shipping_packages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."shipping_packages" ADD CONSTRAINT "shipping_packages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
