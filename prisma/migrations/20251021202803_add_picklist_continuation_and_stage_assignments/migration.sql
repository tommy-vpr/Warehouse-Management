-- CreateEnum
CREATE TYPE "public"."OrderStage" AS ENUM ('PICKING', 'PACKING', 'SHIPPING', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."PickEventType" ADD VALUE 'PICK_REASSIGNED';
ALTER TYPE "public"."PickEventType" ADD VALUE 'PICK_SPLIT';
ALTER TYPE "public"."PickEventType" ADD VALUE 'PARTIAL_COMPLETION';

-- AlterEnum
ALTER TYPE "public"."PickStatus" ADD VALUE 'PARTIALLY_COMPLETED';

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "currentStage" "public"."OrderStage" DEFAULT 'PICKING',
ADD COLUMN     "packingAssignedAt" TIMESTAMP(3),
ADD COLUMN     "packingAssignedTo" TEXT,
ADD COLUMN     "pickingAssignedAt" TIMESTAMP(3),
ADD COLUMN     "pickingAssignedTo" TEXT,
ADD COLUMN     "shippingAssignedAt" TIMESTAMP(3),
ADD COLUMN     "shippingAssignedTo" TEXT;

-- AlterTable
ALTER TABLE "public"."pick_lists" ADD COLUMN     "parentPickListId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_pickingAssignedTo_fkey" FOREIGN KEY ("pickingAssignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_packingAssignedTo_fkey" FOREIGN KEY ("packingAssignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_shippingAssignedTo_fkey" FOREIGN KEY ("shippingAssignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_lists" ADD CONSTRAINT "pick_lists_parentPickListId_fkey" FOREIGN KEY ("parentPickListId") REFERENCES "public"."pick_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
