-- AlterTable
ALTER TABLE "public"."return_orders" ADD COLUMN     "labelCreatedAt" TIMESTAMP(3),
ADD COLUMN     "packagesExpected" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "returnLabelUrl" TEXT,
ADD COLUMN     "returnShippingCost" DECIMAL(10,2);
