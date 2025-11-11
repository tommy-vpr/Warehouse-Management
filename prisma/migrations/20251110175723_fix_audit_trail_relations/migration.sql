-- AlterTable
ALTER TABLE "public"."back_orders" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "expectedRestockDate" TIMESTAMP(3),
ADD COLUMN     "fulfilledBy" TEXT;

-- AlterTable
ALTER TABLE "public"."shipping_packages" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippedBy" TEXT;

-- AddForeignKey
ALTER TABLE "public"."shipping_packages" ADD CONSTRAINT "shipping_packages_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shipping_packages" ADD CONSTRAINT "shipping_packages_shippedBy_fkey" FOREIGN KEY ("shippedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."back_orders" ADD CONSTRAINT "back_orders_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."back_orders" ADD CONSTRAINT "back_orders_fulfilledBy_fkey" FOREIGN KEY ("fulfilledBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
