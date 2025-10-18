-- CreateEnum
CREATE TYPE "public"."ReceivingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."receiving_sessions" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "poReference" TEXT NOT NULL,
    "vendor" TEXT,
    "status" "public"."ReceivingStatus" NOT NULL DEFAULT 'PENDING',
    "countedBy" TEXT NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receiving_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."receiving_lines" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantityCounted" INTEGER NOT NULL,
    "quantityExpected" INTEGER,
    "variance" INTEGER,

    CONSTRAINT "receiving_lines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."receiving_sessions" ADD CONSTRAINT "receiving_sessions_countedBy_fkey" FOREIGN KEY ("countedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."receiving_sessions" ADD CONSTRAINT "receiving_sessions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."receiving_lines" ADD CONSTRAINT "receiving_lines_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."receiving_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
