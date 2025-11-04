-- AlterTable
ALTER TABLE "public"."shipping_packages" ADD COLUMN     "packageNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "packingSlipUrl" TEXT,
ADD COLUMN     "totalPackages" INTEGER NOT NULL DEFAULT 1;
