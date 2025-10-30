/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,sku]` on the table `receiving_lines` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "receiving_lines_sessionId_sku_key" ON "public"."receiving_lines"("sessionId", "sku");
