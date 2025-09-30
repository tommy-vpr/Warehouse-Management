/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `locations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."inventory" ADD COLUMN     "casesOnHand" INTEGER DEFAULT 0,
ADD COLUMN     "casesReserved" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."locations" ADD COLUMN     "bay" INTEGER,
ADD COLUMN     "space" INTEGER,
ADD COLUMN     "tier" TEXT,
ADD COLUMN     "warehouseNumber" INTEGER;

-- AlterTable
ALTER TABLE "public"."product_variants" ADD COLUMN     "flavor" TEXT,
ADD COLUMN     "hasIce" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSalt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNicotineFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "masterCaseDimensions" JSONB,
ADD COLUMN     "masterCaseQty" INTEGER,
ADD COLUMN     "masterCaseWeight" DECIMAL(8,2),
ADD COLUMN     "productLine" TEXT,
ADD COLUMN     "strength" TEXT,
ADD COLUMN     "volume" TEXT;

-- AlterTable
ALTER TABLE "public"."products" ADD COLUMN     "flavor" TEXT,
ADD COLUMN     "productLine" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "locations_barcode_key" ON "public"."locations"("barcode");

-- CreateIndex
CREATE INDEX "locations_warehouseNumber_aisle_bay_tier_space_bin_idx" ON "public"."locations"("warehouseNumber", "aisle", "bay", "tier", "space", "bin");

-- CreateIndex
CREATE INDEX "locations_warehouseNumber_aisle_idx" ON "public"."locations"("warehouseNumber", "aisle");

-- CreateIndex
CREATE INDEX "locations_barcode_idx" ON "public"."locations"("barcode");

-- CreateIndex
CREATE INDEX "locations_type_idx" ON "public"."locations"("type");

-- CreateIndex
CREATE INDEX "product_variants_volume_idx" ON "public"."product_variants"("volume");

-- CreateIndex
CREATE INDEX "product_variants_strength_idx" ON "public"."product_variants"("strength");

-- CreateIndex
CREATE INDEX "product_variants_hasIce_idx" ON "public"."product_variants"("hasIce");

-- CreateIndex
CREATE INDEX "product_variants_hasSalt_idx" ON "public"."product_variants"("hasSalt");

-- CreateIndex
CREATE INDEX "product_variants_flavor_idx" ON "public"."product_variants"("flavor");

-- CreateIndex
CREATE INDEX "product_variants_productLine_idx" ON "public"."product_variants"("productLine");

-- CreateIndex
CREATE INDEX "products_brand_idx" ON "public"."products"("brand");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "public"."products"("category");

-- CreateIndex
CREATE INDEX "products_productLine_idx" ON "public"."products"("productLine");

-- CreateIndex
CREATE INDEX "products_flavor_idx" ON "public"."products"("flavor");
