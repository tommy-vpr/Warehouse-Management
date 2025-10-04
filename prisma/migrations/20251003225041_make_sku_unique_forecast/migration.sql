/*
  Warnings:

  - A unique constraint covering the columns `[sku]` on the table `ForecastSuggestion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ForecastSuggestion_sku_key" ON "public"."ForecastSuggestion"("sku");
