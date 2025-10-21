-- CreateTable
CREATE TABLE "public"."order_images" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_images_orderId_idx" ON "public"."order_images"("orderId");

-- AddForeignKey
ALTER TABLE "public"."order_images" ADD CONSTRAINT "order_images_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
