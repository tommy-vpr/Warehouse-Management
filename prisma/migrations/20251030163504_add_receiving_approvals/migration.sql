-- AlterTable
ALTER TABLE "public"."receiving_sessions" ADD COLUMN     "assignedTo" TEXT;

-- CreateIndex
CREATE INDEX "receiving_sessions_assignedTo_idx" ON "public"."receiving_sessions"("assignedTo");

-- AddForeignKey
ALTER TABLE "public"."receiving_sessions" ADD CONSTRAINT "receiving_sessions_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
