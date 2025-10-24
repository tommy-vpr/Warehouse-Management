/*
  Warnings:

  - The `status` column on the `cycle_count_tasks` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."WorkTaskType" AS ENUM ('PICKING', 'PACKING', 'SHIPPING', 'QC');

-- CreateEnum
CREATE TYPE "public"."WorkTaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'PARTIALLY_COMPLETED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."WorkTaskItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'ISSUE');

-- CreateEnum
CREATE TYPE "public"."WorkTaskEventType" AS ENUM ('TASK_CREATED', 'TASK_ASSIGNED', 'TASK_STARTED', 'TASK_PAUSED', 'TASK_RESUMED', 'ITEM_COMPLETED', 'ITEM_SKIPPED', 'TASK_COMPLETED', 'TASK_CANCELLED', 'TASK_REASSIGNED', 'TASK_SPLIT');

-- CreateEnum
CREATE TYPE "public"."CycleCountTaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VARIANCE_REVIEW', 'RECOUNT_REQUIRED', 'SKIPPED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."cycle_count_tasks" DROP COLUMN "status",
ADD COLUMN     "status" "public"."CycleCountTaskStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "public"."TaskStatus";

-- CreateTable
CREATE TABLE "public"."work_tasks" (
    "id" TEXT NOT NULL,
    "taskNumber" TEXT NOT NULL,
    "type" "public"."WorkTaskType" NOT NULL,
    "status" "public"."WorkTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "orderIds" TEXT[],
    "totalOrders" INTEGER NOT NULL,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "parentTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_items" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "locationId" TEXT,
    "quantityRequired" INTEGER NOT NULL,
    "quantityCompleted" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."WorkTaskItemStatus" NOT NULL DEFAULT 'PENDING',
    "sequence" INTEGER NOT NULL,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_events" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "eventType" "public"."WorkTaskEventType" NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_tasks_taskNumber_key" ON "public"."work_tasks"("taskNumber");

-- CreateIndex
CREATE INDEX "work_tasks_type_status_idx" ON "public"."work_tasks"("type", "status");

-- CreateIndex
CREATE INDEX "work_tasks_assignedTo_idx" ON "public"."work_tasks"("assignedTo");

-- CreateIndex
CREATE INDEX "task_items_taskId_idx" ON "public"."task_items"("taskId");

-- CreateIndex
CREATE INDEX "task_items_orderId_idx" ON "public"."task_items"("orderId");

-- CreateIndex
CREATE INDEX "task_events_taskId_idx" ON "public"."task_events"("taskId");

-- AddForeignKey
ALTER TABLE "public"."work_tasks" ADD CONSTRAINT "work_tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "public"."work_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_tasks" ADD CONSTRAINT "work_tasks_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_items" ADD CONSTRAINT "task_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_items" ADD CONSTRAINT "task_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_items" ADD CONSTRAINT "task_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_items" ADD CONSTRAINT "task_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_items" ADD CONSTRAINT "task_items_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_events" ADD CONSTRAINT "task_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."work_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_events" ADD CONSTRAINT "task_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
