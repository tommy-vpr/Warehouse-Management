-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "shippingCarrier" TEXT,
ADD COLUMN     "shippingCost" TEXT,
ADD COLUMN     "shippingService" TEXT;
