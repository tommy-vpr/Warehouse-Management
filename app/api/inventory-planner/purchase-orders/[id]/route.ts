// app/api/inventory-planner/purchase-orders/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const po = await prisma.inventoryPlannerPurchaseOrder.findUnique({
    where: { id: params.id },
    include: { lines: true },
  });

  if (!po) {
    return NextResponse.json({ error: "PO not found" }, { status: 404 });
  }

  return NextResponse.json(po);
}
