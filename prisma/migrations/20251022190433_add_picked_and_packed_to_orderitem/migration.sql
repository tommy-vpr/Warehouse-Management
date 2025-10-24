-- AlterTable
ALTER TABLE "public"."order_items" ADD COLUMN     "quantityPacked" INTEGER DEFAULT 0,
ADD COLUMN     "quantityPicked" INTEGER DEFAULT 0;
