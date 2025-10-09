/*
  Warnings:

  - The values [RESERVED_ELSEWHERE] on the enum `BackOrderReason` will be removed. If these variants are still used in the database, this will fail.
  - The values [RESTOCK_REQUESTED,PARTIALLY_FULFILLED,EXPIRED] on the enum `BackOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `actualRestockDate` on the `back_orders` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedRestockDate` on the `back_orders` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `back_orders` table. All the data in the column will be lost.
  - You are about to drop the column `partialShipments` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `back_order_fulfillments` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BackOrderReason_new" AS ENUM ('OUT_OF_STOCK', 'SHORT_PICK', 'DAMAGED_PRODUCT', 'LOCATION_EMPTY', 'SKIPPED', 'OTHER');
ALTER TABLE "public"."back_orders" ALTER COLUMN "reason" TYPE "public"."BackOrderReason_new" USING ("reason"::text::"public"."BackOrderReason_new");
ALTER TYPE "public"."BackOrderReason" RENAME TO "BackOrderReason_old";
ALTER TYPE "public"."BackOrderReason_new" RENAME TO "BackOrderReason";
DROP TYPE "public"."BackOrderReason_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."BackOrderStatus_new" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');
ALTER TABLE "public"."back_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."back_orders" ALTER COLUMN "status" TYPE "public"."BackOrderStatus_new" USING ("status"::text::"public"."BackOrderStatus_new");
ALTER TYPE "public"."BackOrderStatus" RENAME TO "BackOrderStatus_old";
ALTER TYPE "public"."BackOrderStatus_new" RENAME TO "BackOrderStatus";
DROP TYPE "public"."BackOrderStatus_old";
ALTER TABLE "public"."back_orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."back_order_fulfillments" DROP CONSTRAINT "back_order_fulfillments_backOrderId_fkey";

-- DropIndex
DROP INDEX "public"."back_orders_estimatedRestockDate_idx";

-- AlterTable
ALTER TABLE "public"."back_orders" DROP COLUMN "actualRestockDate",
DROP COLUMN "estimatedRestockDate",
DROP COLUMN "expiresAt";

-- AlterTable
ALTER TABLE "public"."orders" DROP COLUMN "partialShipments";

-- DropTable
DROP TABLE "public"."back_order_fulfillments";
