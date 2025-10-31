// app/api/invoice/[id]/pdf/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: {
          include: { productVariant: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    // Company header
    page.drawText("INVOICE", {
      x: 50,
      y,
      size: 24,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Invoice barcode
    if (invoice.barcode) {
      try {
        const barcodeData = invoice.barcode.split(",")[1];
        const barcodeImage = await pdfDoc.embedPng(
          Buffer.from(barcodeData, "base64")
        );
        page.drawImage(barcodeImage, {
          x: width - 250,
          y: y - 40,
          width: 200,
          height: 40,
        });
      } catch (e) {
        console.error("Failed to embed invoice barcode:", e);
      }
    }

    y -= 70;

    // Invoice details
    page.drawText(`Invoice #: ${invoice.invoiceNumber}`, {
      x: 50,
      y,
      size: 12,
      font,
    });
    y -= 20;

    page.drawText(`Date: ${invoice.date.toISOString().split("T")[0]}`, {
      x: 50,
      y,
      size: 12,
      font,
    });

    if (invoice.dueDate) {
      y -= 20;
      page.drawText(
        `Due Date: ${invoice.dueDate.toISOString().split("T")[0]}`,
        {
          x: 50,
          y,
          size: 12,
          font,
        }
      );
    }

    y -= 40;

    // Vendor info
    page.drawText("From:", { x: 50, y, size: 12, font: fontBold });
    y -= 18;
    page.drawText(invoice.vendorName, { x: 50, y, size: 11, font });

    if (invoice.vendorAddress) {
      y -= 16;
      const addressLines = invoice.vendorAddress.split("\n");
      for (const line of addressLines) {
        page.drawText(line, { x: 50, y, size: 10, font });
        y -= 14;
      }
    }

    if (invoice.vendorEmail) {
      y -= 2;
      page.drawText(invoice.vendorEmail, {
        x: 50,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 14;
    }

    if (invoice.vendorPhone) {
      page.drawText(invoice.vendorPhone, {
        x: 50,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 14;
    }

    y -= 30;

    // Items header
    page.drawRectangle({
      x: 50,
      y: y - 20,
      width: width - 100,
      height: 25,
      color: rgb(0.95, 0.95, 0.95),
    });

    page.drawText("Item", { x: 60, y: y - 12, size: 10, font: fontBold });
    page.drawText("SKU", { x: 280, y: y - 12, size: 10, font: fontBold });
    page.drawText("Qty", { x: 380, y: y - 12, size: 10, font: fontBold });
    page.drawText("Price", { x: 430, y: y - 12, size: 10, font: fontBold });
    page.drawText("Total", { x: 490, y: y - 12, size: 10, font: fontBold });

    y -= 35;

    // Items
    for (const item of invoice.items) {
      // Draw barcode if available
      if (item.barcode) {
        try {
          const barcodeData = item.barcode.split(",")[1];
          const barcodeImage = await pdfDoc.embedPng(
            Buffer.from(barcodeData, "base64")
          );
          page.drawImage(barcodeImage, {
            x: 60,
            y: y - 25,
            width: 80,
            height: 20,
          });
        } catch (e) {
          console.error("Failed to embed barcode:", e);
        }
      }

      // Description
      const description =
        item.description.length > 40
          ? item.description.substring(0, 40) + "..."
          : item.description;

      page.drawText(description, {
        x: 150,
        y: y - 10,
        size: 9,
        font,
      });

      // SKU
      page.drawText(item.sku, {
        x: 280,
        y: y - 10,
        size: 8,
        font,
      });

      // Quantity
      page.drawText(item.quantity.toString(), {
        x: 390,
        y: y - 10,
        size: 9,
        font,
      });

      // Unit Price
      page.drawText(`$${item.unitPrice.toString()}`, {
        x: 430,
        y: y - 10,
        size: 9,
        font,
      });

      // Total
      page.drawText(`$${item.total.toString()}`, {
        x: 490,
        y: y - 10,
        size: 9,
        font,
      });

      y -= 35;

      // Add new page if needed
      if (y < 150) {
        const newPage = pdfDoc.addPage([595, 842]);
        y = height - 50;
      }
    }

    // Totals
    y -= 20;
    page.drawLine({
      start: { x: 350, y },
      end: { x: width - 50, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    y -= 25;
    page.drawText("Subtotal:", { x: 400, y, size: 11, font });
    page.drawText(`$${invoice.subtotal.toString()}`, {
      x: 490,
      y,
      size: 11,
      font,
    });

    y -= 20;
    page.drawText("Tax:", { x: 400, y, size: 11, font });
    page.drawText(`$${invoice.tax.toString()}`, {
      x: 490,
      y,
      size: 11,
      font,
    });

    y -= 25;
    page.drawText("Total:", { x: 400, y, size: 13, font: fontBold });
    page.drawText(`$${invoice.total.toString()}`, {
      x: 490,
      y,
      size: 13,
      font: fontBold,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
