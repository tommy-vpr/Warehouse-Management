-- AlterTable
ALTER TABLE "public"."product_variants" ADD COLUMN     "barcode" TEXT;

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" TEXT;
