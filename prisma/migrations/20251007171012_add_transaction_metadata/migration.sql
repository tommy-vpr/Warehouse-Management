-- AlterTable
ALTER TABLE "public"."inventory_transactions" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "inventory_transactions_productVariantId_idx" ON "public"."inventory_transactions"("productVariantId");

-- CreateIndex
CREATE INDEX "inventory_transactions_locationId_idx" ON "public"."inventory_transactions"("locationId");

-- CreateIndex
CREATE INDEX "inventory_transactions_userId_idx" ON "public"."inventory_transactions"("userId");

-- CreateIndex
CREATE INDEX "inventory_transactions_referenceType_idx" ON "public"."inventory_transactions"("referenceType");
