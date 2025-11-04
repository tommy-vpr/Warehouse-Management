// lib/packing-slip-generator.ts
// Lightweight alternative using pdf-lib (no Chromium required)
// Use this if you want faster generation without browser dependencies

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Storage } from "@google-cloud/storage";
import { nanoid } from "nanoid";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);

interface PackingSlipData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  shippingAddress: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  };
  items: Array<{
    sku: string;
    productName: string;
    quantity: number;
    unitPrice: string;
  }>;
  packageNumber: number;
  totalPackages: number;
  trackingNumber: string;
  carrierCode: string;
  serviceCode: string;
  total: number;
  hasBackOrders?: boolean;
}

/**
 * Generate packing slip using pdf-lib (lightweight, no browser needed)
 * Faster but less flexible than Puppeteer approach
 */
export async function generatePackingSlip(
  data: PackingSlipData
): Promise<string> {
  let tempFilePath: string | null = null;

  try {
    console.log("Starting packing slip generation:", {
      orderId: data.orderId,
      packageNumber: data.packageNumber,
    });

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Embed fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colors
    const black = rgb(0, 0, 0);
    const darkGray = rgb(0.2, 0.2, 0.2);
    const mediumGray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.9, 0.9, 0.9);

    let yPosition = height - 60;

    // Header - Company Name
    page.drawText("VPR Collections", {
      x: 50,
      y: yPosition,
      size: 20,
      font: helveticaBold,
      color: black,
    });

    yPosition -= 20;
    page.drawText("123 Warehouse Street, City, ST 12345", {
      x: 50,
      y: yPosition,
      size: 9,
      font: helvetica,
      color: mediumGray,
    });

    // Packing Slip Title (right side)
    page.drawText("PACKING SLIP", {
      x: width - 200,
      y: height - 60,
      size: 24,
      font: helveticaBold,
      color: black,
    });

    page.drawText(`Order: ${data.orderNumber}`, {
      x: width - 200,
      y: height - 85,
      size: 11,
      font: helvetica,
      color: darkGray,
    });

    if (data.totalPackages > 1) {
      page.drawText(`Package ${data.packageNumber} of ${data.totalPackages}`, {
        x: width - 200,
        y: height - 105,
        size: 10,
        font: helveticaBold,
        color: darkGray,
      });
    }

    // Line separator
    yPosition = height - 130;
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 2,
      color: black,
    });

    yPosition -= 30;

    // Ship To Section
    page.drawText("SHIP TO:", {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: darkGray,
    });

    yPosition -= 20;
    page.drawText(data.customerName, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: darkGray,
    });

    yPosition -= 15;
    if (data.customerEmail) {
      page.drawText(data.customerEmail, {
        x: 50,
        y: yPosition,
        size: 9,
        font: helvetica,
        color: mediumGray,
      });
      yPosition -= 15;
    }

    page.drawText(data.shippingAddress.address1, {
      x: 50,
      y: yPosition,
      size: 9,
      font: helvetica,
      color: darkGray,
    });
    yPosition -= 13;

    if (data.shippingAddress.address2) {
      page.drawText(data.shippingAddress.address2, {
        x: 50,
        y: yPosition,
        size: 9,
        font: helvetica,
        color: darkGray,
      });
      yPosition -= 13;
    }

    page.drawText(
      `${data.shippingAddress.city}, ${data.shippingAddress.province} ${data.shippingAddress.zip}`,
      {
        x: 50,
        y: yPosition,
        size: 9,
        font: helvetica,
        color: darkGray,
      }
    );
    yPosition -= 13;

    page.drawText(data.shippingAddress.country, {
      x: 50,
      y: yPosition,
      size: 9,
      font: helvetica,
      color: darkGray,
    });

    // Items Table
    yPosition -= 40;

    // Table header background
    page.drawRectangle({
      x: 50,
      y: yPosition - 18,
      width: width - 100,
      height: 20,
      color: black,
    });

    // Table headers
    page.drawText("SKU", {
      x: 60,
      y: yPosition - 13,
      size: 9,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Product", {
      x: 180,
      y: yPosition - 13,
      size: 9,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Qty", {
      x: 420,
      y: yPosition - 13,
      size: 9,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Price", {
      x: 470,
      y: yPosition - 13,
      size: 9,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Total", {
      x: 520,
      y: yPosition - 13,
      size: 9,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    yPosition -= 28;

    // Table items
    let itemsTotal = 0;
    for (const item of data.items) {
      const lineTotal = parseFloat(item.unitPrice) * item.quantity;
      itemsTotal += lineTotal;

      // Alternate row background
      if (data.items.indexOf(item) % 2 === 1) {
        page.drawRectangle({
          x: 50,
          y: yPosition - 15,
          width: width - 100,
          height: 18,
          color: lightGray,
        });
      }

      page.drawText(item.sku, {
        x: 60,
        y: yPosition - 10,
        size: 8,
        font: helvetica,
        color: darkGray,
      });

      // Truncate product name if too long
      const maxProductLength = 35;
      const productName =
        item.productName.length > maxProductLength
          ? item.productName.substring(0, maxProductLength) + "..."
          : item.productName;

      page.drawText(productName, {
        x: 180,
        y: yPosition - 10,
        size: 8,
        font: helvetica,
        color: darkGray,
      });

      page.drawText(item.quantity.toString(), {
        x: 430,
        y: yPosition - 10,
        size: 8,
        font: helvetica,
        color: darkGray,
      });

      page.drawText(`$${parseFloat(item.unitPrice).toFixed(2)}`, {
        x: 470,
        y: yPosition - 10,
        size: 8,
        font: helvetica,
        color: darkGray,
      });

      page.drawText(`$${lineTotal.toFixed(2)}`, {
        x: 520,
        y: yPosition - 10,
        size: 8,
        font: helvetica,
        color: darkGray,
      });

      yPosition -= 20;
    }

    // Total
    yPosition -= 10;
    page.drawText("TOTAL:", {
      x: 470,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: darkGray,
    });
    page.drawText(`$${itemsTotal.toFixed(2)}`, {
      x: 520,
      y: yPosition,
      size: 10,
      font: helveticaBold,
      color: darkGray,
    });

    // Tracking Number Box
    yPosition -= 50;

    // black box background
    page.drawRectangle({
      x: 50,
      y: yPosition - 45,
      width: width - 100,
      height: 55,
      color: rgb(0.93, 0.96, 1),
      borderColor: black,
      borderWidth: 2,
    });

    page.drawText("TRACKING NUMBER:", {
      x: 60,
      y: yPosition - 15,
      size: 9,
      font: helveticaBold,
      color: black,
    });

    page.drawText(data.trackingNumber, {
      x: 60,
      y: yPosition - 32,
      size: 16,
      font: helveticaBold,
      color: black,
    });

    page.drawText(
      `Carrier: ${data.carrierCode.toUpperCase()} | Service: ${
        data.serviceCode
      }`,
      {
        x: 60,
        y: yPosition - 50,
        size: 8,
        font: helvetica,
        color: mediumGray,
      }
    );

    // Back order notice
    if (data.hasBackOrders) {
      yPosition -= 70;

      page.drawRectangle({
        x: 50,
        y: yPosition - 35,
        width: width - 100,
        height: 40,
        color: rgb(1, 0.98, 0.86),
        borderColor: rgb(0.96, 0.62, 0.04),
        borderWidth: 2,
      });

      page.drawText("⚠ PARTIAL SHIPMENT NOTICE", {
        x: 60,
        y: yPosition - 15,
        size: 9,
        font: helveticaBold,
        color: rgb(0.57, 0.25, 0.05),
      });

      page.drawText(
        "Some items from your order were back-ordered and will ship separately.",
        {
          x: 60,
          y: yPosition - 28,
          size: 8,
          font: helvetica,
          color: rgb(0.57, 0.25, 0.05),
        }
      );
    }

    // Footer
    page.drawText(
      "Thank you for your business! Questions? Contact us at support@vprcollections.com",
      {
        x: 50,
        y: 30,
        size: 8,
        font: helvetica,
        color: mediumGray,
      }
    );

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    console.log("PDF generated, size:", pdfBytes.length);

    // Save to temp file
    const sanitizedOrderNumber = data.orderNumber.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    );
    tempFilePath = path.join(
      tmpdir(),
      `packing-slip-${Date.now()}-${sanitizedOrderNumber}-pkg${
        data.packageNumber
      }.pdf`
    );

    await writeFile(tempFilePath, Buffer.from(pdfBytes));
    console.log("Temp file created:", tempFilePath);

    // Upload to GCS
    const fileName = `packing-slips/${data.orderId}/package-${
      data.packageNumber
    }-${nanoid()}.pdf`;

    console.log("Uploading to GCS:", fileName);

    // Upload from file (most reliable method)
    await bucket.upload(tempFilePath, {
      destination: fileName,
      metadata: {
        contentType: "application/pdf",
        cacheControl: "public, max-age=31536000",
        metadata: {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          packageNumber: data.packageNumber.toString(),
          trackingNumber: data.trackingNumber,
        },
      },
    });

    console.log("Upload complete, cleaning up temp file");

    // Clean up temp file
    await unlink(tempFilePath);
    tempFilePath = null;

    const publicUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${fileName}`;
    console.log("Public URL:", publicUrl);

    return publicUrl;
  } catch (err: any) {
    console.error("=== Packing Slip Generation Error ===");
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);

    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        console.log("Temp file cleaned up");
      } catch (cleanupErr) {
        console.error("Failed to clean up temp file:", cleanupErr);
      }
    }

    throw new Error(`Failed to generate packing slip: ${err.message}`);
  }
}

/**
 * Generate packing slips for all packages in an order
 */
export async function generatePackingSlipsForOrder(orderId: string) {
  const { prisma } = await import("./prisma");

  console.log("Generating packing slips for order:", orderId);

  // Get order with packages and items
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      packages: {
        include: {
          items: true,
        },
        orderBy: {
          packageNumber: "asc",
        },
      },
      items: {
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      },
      backOrders: {
        where: {
          status: {
            in: ["PENDING", "ALLOCATED"],
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const packingSlipUrls: Array<{ packageId: string; url: string }> = [];

  // Generate packing slip for each package
  for (const pkg of order.packages) {
    console.log(
      `Processing package ${pkg.packageNumber} of ${order.packages.length}`
    );

    // Get items for this package
    const packageItems = pkg.items.map((item) => {
      return {
        sku: item.sku,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
      };
    });

    const packingSlipData: PackingSlipData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail || undefined,
      shippingAddress: order.shippingAddress as any,
      items: packageItems,
      packageNumber: pkg.packageNumber || 1,
      totalPackages: order.packages.length,
      trackingNumber: pkg.trackingNumber,
      carrierCode: pkg.carrierCode,
      serviceCode: pkg.serviceCode,
      total: parseFloat(order.totalAmount.toString()),
      hasBackOrders: order.backOrders.length > 0,
    };

    // Generate packing slip
    const url = await generatePackingSlip(packingSlipData);

    // Update package with packing slip URL
    await prisma.shippingPackage.update({
      where: { id: pkg.id },
      data: { packingSlipUrl: url },
    });

    console.log(`Package ${pkg.packageNumber} packing slip created:`, url);

    packingSlipUrls.push({ packageId: pkg.id, url });
  }

  console.log(`Generated ${packingSlipUrls.length} packing slips`);

  return packingSlipUrls;
}

/**
 * PROS of pdf-lib approach:
 * - Much faster (no browser launch)
 * - Smaller deployment size (no Chromium)
 * - Lower memory usage
 * - More reliable in serverless environments
 *
 * CONS:
 * - Less flexible styling
 * - Manual positioning required
 * - No CSS/HTML
 * - Harder to maintain complex layouts
 *
 * RECOMMENDATION:
 * - Use pdf-lib for simple, consistent layouts
 * - Use Puppeteer for complex, customized designs
 */
