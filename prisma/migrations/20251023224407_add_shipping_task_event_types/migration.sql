-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'LABEL_GENERATED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'LABEL_PRINTED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'LABEL_VOIDED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'PACKAGE_WEIGHED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'PACKAGE_DIMENSIONS_RECORDED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'CARRIER_SELECTED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'SERVICE_LEVEL_SELECTED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'RATE_SHOPPED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'INSURANCE_ADDED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'SIGNATURE_REQUIRED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'TRACKING_NUMBER_ASSIGNED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'SHIPMENT_MANIFESTED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'PICKUP_SCHEDULED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'PACKAGE_SCANNED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'SHIPMENT_VOIDED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'CUSTOMS_FORM_CREATED';
ALTER TYPE "public"."WorkTaskEventType" ADD VALUE 'HAZMAT_DECLARED';
