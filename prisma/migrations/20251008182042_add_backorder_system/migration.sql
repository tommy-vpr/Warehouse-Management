/*
  Warnings:

  - The values [OUT_OF_STOCK,SKIPPED] on the enum `BackOrderReason` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `customerNotified` on the `back_orders` table. All the data in the column will be lost.
  - You are about to drop the column `notifiedAt` on the `back_orders` table. All the data in the column will be lost.
  - You are about to drop the column `originalOrderDate` on the `back_orders` table. All the data in the column will be lost.
  - You are about to drop the column `originalPickListId` on the `back_orders` table. All the data in the column will be lost.
  - Added the required column `createdDuring` to the `back_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BackOrderReason_new" AS ENUM ('INSUFFICIENT_STOCK_AT_ALLOCATION', 'SHORT_PICK', 'ITEM_SKIPPED', 'DAMAGED_PRODUCT', 'LOCATION_EMPTY', 'OTHER');
ALTER TABLE "public"."back_orders" ALTER COLUMN "reason" TYPE "public"."BackOrderReason_new" USING ("reason"::text::"public"."BackOrderReason_new");
ALTER TYPE "public"."BackOrderReason" RENAME TO "BackOrderReason_old";
ALTER TYPE "public"."BackOrderReason_new" RENAME TO "BackOrderReason";
DROP TYPE "public"."BackOrderReason_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."back_orders" DROP COLUMN "customerNotified",
DROP COLUMN "notifiedAt",
DROP COLUMN "originalOrderDate",
DROP COLUMN "originalPickListId",
ADD COLUMN     "createdDuring" TEXT NOT NULL;
