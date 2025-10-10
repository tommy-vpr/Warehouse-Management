-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TransactionType" ADD VALUE 'PO_RECEIVING';
ALTER TYPE "public"."TransactionType" ADD VALUE 'ASN_RECEIVING';
ALTER TYPE "public"."TransactionType" ADD VALUE 'TRANSFER_RECEIVING';
ALTER TYPE "public"."TransactionType" ADD VALUE 'RETURNS';

-- AlterTable
ALTER TABLE "public"."inventory_transactions" ADD COLUMN     "sourceLocation" TEXT;
