/*
  Warnings:

  - A unique constraint covering the columns `[campaignId,locationId,productVariantId]` on the table `cycle_count_tasks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."cycle_count_tasks_locationId_productVariantId_key";

-- CreateIndex
CREATE UNIQUE INDEX "cycle_count_tasks_campaignId_locationId_productVariantId_key" ON "public"."cycle_count_tasks"("campaignId", "locationId", "productVariantId");
