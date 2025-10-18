-- CreateIndex
CREATE INDEX "receiving_sessions_poId_idx" ON "public"."receiving_sessions"("poId");

-- CreateIndex
CREATE INDEX "receiving_sessions_status_idx" ON "public"."receiving_sessions"("status");

-- CreateIndex
CREATE INDEX "receiving_sessions_countedBy_idx" ON "public"."receiving_sessions"("countedBy");
