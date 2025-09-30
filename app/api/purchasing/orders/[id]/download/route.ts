import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePDF } from "@/utils/pdf-generator";
import { generatePOReportHTML } from "@/utils/po-report-template";

interface Params {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Format data for PDF
    const poData = {
      poNumber: purchaseOrder.poNumber,
      supplier: purchaseOrder.supplier,
      expectedDate: purchaseOrder.expectedDate?.toISOString(),
      createdAt: purchaseOrder.createdAt.toISOString(),
      createdBy: session.user.name || "Admin",
      totalCost: parseFloat(purchaseOrder.totalAmount.toString()),
      items: purchaseOrder.items.map((item) => ({
        productName: item.productVariant.product.name,
        sku: item.productVariant.sku,
        volume: item.productVariant.volume,
        strength: item.productVariant.strength,
        quantity: item.quantity,
        unitCost: parseFloat(item.unitCost.toString()),
        totalCost: parseFloat(item.totalCost.toString()),
      })),
    };

    // Generate HTML and PDF
    const htmlContent = generatePOReportHTML(poData);
    const pdfBuffer = await generatePDF(htmlContent);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${purchaseOrder.poNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PO PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
