// app/api/picking/single/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateSinglePickList } from "@/lib/generateSinglePickList";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const result = await generateSinglePickList({
      orderIds: [orderId],
      pickingStrategy: "SINGLE",
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, pickList: result });
  } catch (error) {
    console.error("❌ Single Pick List Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
