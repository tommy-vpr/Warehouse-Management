// app/api/inventory/receive/session/[poId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { poId: string } }
) {
  const session = await prisma.receivingSession.findFirst({
    where: {
      poId: params.poId,
      status: "PENDING",
    },
    include: {
      lineItems: true,
    },
  });

  return NextResponse.json({ session });
}
