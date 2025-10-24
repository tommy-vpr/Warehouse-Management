-- AlterTable
ALTER TABLE "public"."pick_list_items" ADD COLUMN     "orderItemId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."pick_list_items" ADD CONSTRAINT "pick_list_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
