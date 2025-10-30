// app/api/inventory/po-barcode/list/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "0");

    const skip = page * limit;

    // Build where clause
    const where: any = {};
    if (status !== "all") {
      where.status = status;
    }

    // Fetch barcodes
    const [barcodes, total] = await Promise.all([
      prisma.pOBarcode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.pOBarcode.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      barcodes,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch barcodes:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
