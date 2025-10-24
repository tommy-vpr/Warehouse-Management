-- AlterTable
ALTER TABLE "public"."pick_events" ADD COLUMN     "fromUserId" TEXT,
ADD COLUMN     "toUserId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."pick_events" ADD CONSTRAINT "pick_events_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pick_events" ADD CONSTRAINT "pick_events_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
