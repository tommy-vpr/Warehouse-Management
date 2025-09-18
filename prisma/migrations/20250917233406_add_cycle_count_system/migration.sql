-- CreateEnum
CREATE TYPE "public"."CycleCountType" AS ENUM ('FULL', 'PARTIAL', 'ABC_ANALYSIS', 'FAST_MOVING', 'SLOW_MOVING', 'NEGATIVE_STOCK', 'ZERO_STOCK', 'HIGH_VALUE', 'DAMAGED_LOCATION');

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VARIANCE_REVIEW', 'RECOUNT_REQUIRED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CountEventType" AS ENUM ('TASK_CREATED', 'TASK_ASSIGNED', 'COUNT_STARTED', 'COUNT_RECORDED', 'COUNT_SKIPPED', 'VARIANCE_NOTED', 'RECOUNT_REQUESTED', 'TASK_COMPLETED', 'TASK_CANCELLED', 'NOTE_ADDED');

-- CreateEnum
CREATE TYPE "public"."CountFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'AD_HOC');

-- CreateTable
CREATE TABLE "public"."cycle_count_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "countType" "public"."CycleCountType" NOT NULL,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "frequency" "public"."CountFrequency",
    "locationIds" TEXT[],
    "zoneFilter" TEXT,
    "abcClass" TEXT,
    "lastCountedBefore" TIMESTAMP(3),
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "variancesFound" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_count_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cycle_count_tasks" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "locationId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "taskNumber" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "countType" "public"."CycleCountType" NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "countedQuantity" INTEGER,
    "variance" INTEGER,
    "variancePercentage" DECIMAL(5,2),
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "tolerancePercentage" DECIMAL(5,2) DEFAULT 5.0,
    "requiresRecount" BOOLEAN NOT NULL DEFAULT false,
    "recountReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_count_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cycle_count_events" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "eventType" "public"."CountEventType" NOT NULL,
    "userId" TEXT NOT NULL,
    "previousValue" INTEGER,
    "newValue" INTEGER,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cycle_count_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cycle_count_tasks_taskNumber_key" ON "public"."cycle_count_tasks"("taskNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_count_tasks_locationId_productVariantId_key" ON "public"."cycle_count_tasks"("locationId", "productVariantId");

-- AddForeignKey
ALTER TABLE "public"."cycle_count_tasks" ADD CONSTRAINT "cycle_count_tasks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."cycle_count_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cycle_count_tasks" ADD CONSTRAINT "cycle_count_tasks_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cycle_count_tasks" ADD CONSTRAINT "cycle_count_tasks_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cycle_count_tasks" ADD CONSTRAINT "cycle_count_tasks_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cycle_count_events" ADD CONSTRAINT "cycle_count_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."cycle_count_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cycle_count_events" ADD CONSTRAINT "cycle_count_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
