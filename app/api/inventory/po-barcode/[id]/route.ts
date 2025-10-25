// app/api/inventory/po-barcode/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const barcodeId = params.id;

    const barcode = await prisma.pOBarcode.findUnique({
      where: { id: barcodeId },
    });

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: "Barcode not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      barcode,
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch barcode:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
