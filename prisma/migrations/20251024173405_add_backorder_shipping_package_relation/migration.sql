-- AlterTable
ALTER TABLE "public"."back_orders" ADD COLUMN     "shippingPackageId" TEXT;

-- CreateIndex
CREATE INDEX "back_orders_shippingPackageId_idx" ON "public"."back_orders"("shippingPackageId");

-- AddForeignKey
ALTER TABLE "public"."back_orders" ADD CONSTRAINT "back_orders_shippingPackageId_fkey" FOREIGN KEY ("shippingPackageId") REFERENCES "public"."shipping_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
