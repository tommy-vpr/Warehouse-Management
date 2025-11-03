// app/api/invoice/create/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Storage } from "@google-cloud/storage";
import sharp from "sharp";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY,
  },
});

const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);

// ✅ Generate numeric-only barcode
function generateNumericBarcode(length: number = 12): string {
  const timestamp = Date.now().toString(); // Current timestamp
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0"); // Random 6-digit number

  const combined = timestamp + random;

  // Take the last 'length' digits
  return combined.slice(-length);
}

async function matchProductVariant(sku: string, name: string) {
  // Try exact SKU match first
  let variant = await prisma.productVariant.findUnique({
    where: { sku },
  });

  if (variant) return variant;

  // Try UPC/barcode match
  variant = await prisma.productVariant.findFirst({
    where: {
      OR: [{ upc: sku }, { barcode: sku }],
    },
  });

  if (variant) return variant;

  // Try fuzzy match on description
  variant = await prisma.productVariant.findFirst({
    where: {
      OR: [
        { name: { contains: name, mode: "insensitive" } },
        { sku: { contains: sku, mode: "insensitive" } },
      ],
    },
  });

  return variant;
}

export async function POST(req: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string;
    const orderId = formData.get("orderId") as string | null;

    // Get invoice data
    const invoiceNumber = formData.get("invoiceNumber") as string;
    const vendorName = formData.get("vendorName") as string;
    const vendorEmail = formData.get("vendorEmail") as string;
    const vendorAddress = formData.get("vendorAddress") as string;
    const vendorPhone = formData.get("vendorPhone") as string;
    const date = formData.get("date") as string;
    const dueDate = formData.get("dueDate") as string;
    const tax = parseFloat(formData.get("tax") as string);
    const shipping = parseFloat(formData.get("shipping") as string) || 0;
    const fees = parseFloat(formData.get("fees") as string) || 0;
    const itemsJson = formData.get("items") as string;

    console.log("Creating invoice:", { invoiceNumber, vendorName });

    if (!invoiceNumber || !vendorName) {
      return NextResponse.json(
        { error: "Invoice number and vendor name are required" },
        { status: 400 }
      );
    }

    const items = JSON.parse(itemsJson);

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unitPrice,
      0
    );
    const total = subtotal + tax + shipping + fees;

    // Handle file upload if provided
    let originalInvoiceUrl: string | null = null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "File must be an image" },
          { status: 400 }
        );
      }

      // Process image
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const optimized = await sharp(buffer)
        .resize(2048, 2048, { fit: "inside" })
        .jpeg({ quality: 85 })
        .toBuffer();

      console.log("Image optimized, size:", optimized.length);

      // Save to temp file
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      tempFilePath = path.join(
        tmpdir(),
        `invoice-${Date.now()}-${sanitizedFileName}.jpg`
      );

      await writeFile(tempFilePath, optimized);
      console.log("Temp file created:", tempFilePath);

      // Upload to GCS
      const fileName = `invoices/${Date.now()}-${sanitizedFileName}`;
      console.log("Uploading to GCS:", fileName);

      await bucket.upload(tempFilePath, {
        destination: fileName,
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
        },
      });

      console.log("Upload complete");

      // Clean up temp file
      await unlink(tempFilePath);
      tempFilePath = null;

      originalInvoiceUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${fileName}`;
    }

    // ✅ Generate numeric-only barcode (14 digits for invoice)
    const invoiceBarcodeValue = generateNumericBarcode(14);

    // ✅ Process items - generate numeric barcodes
    const processedItems = await Promise.all(
      items.map(async (item: any) => {
        // Generate numeric barcode (12 digits for items)
        const skuBarcodeValue = generateNumericBarcode(12);

        // Try to match with existing product variant
        const variant = await matchProductVariant(item.sku, item.name);

        return {
          sku: item.sku,
          barcodeValue: skuBarcodeValue,
          name: item.name,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          total: parseInt(item.quantity) * parseFloat(item.unitPrice),
          productVariantId: variant?.id || null,
        };
      })
    );

    // Verify order exists if provided
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
    }

    // Save to database
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        barcodeValue: invoiceBarcodeValue,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : null,
        vendorName,
        vendorEmail: vendorEmail || null,
        vendorAddress: vendorAddress || null,
        vendorPhone: vendorPhone || null,
        subtotal,
        tax,
        shipping,
        fees,
        total,
        originalInvoiceUrl,
        status: "DRAFT",
        createdBy: userId,
        orderId: orderId || null,
        items: {
          create: processedItems,
        },
      },
      include: {
        items: {
          include: {
            productVariant: true,
          },
        },
        order: true,
      },
    });

    console.log("Invoice created:", invoice.id);

    return NextResponse.json({
      success: true,
      invoice,
      message: "Invoice created successfully",
    });
  } catch (err: any) {
    console.error("=== Invoice Create Error ===");
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

    return NextResponse.json(
      {
        error: err.message || "Failed to create invoice",
      },
      { status: 500 }
    );
  }
}

// // app/api/invoice/create/route.ts
// export const runtime = "nodejs";

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { Storage } from "@google-cloud/storage";
// import sharp from "sharp";
// import { writeFile, unlink } from "fs/promises";
// import path from "path";
// import { tmpdir } from "os";
// import bwipjs from "bwip-js";

// const storage = new Storage({
//   projectId: process.env.GCP_PROJECT_ID,
//   credentials: {
//     client_email: process.env.GCP_CLIENT_EMAIL,
//     private_key: process.env.GCP_PRIVATE_KEY,
//   },
// });

// const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);

// async function generateCode128Barcode(text: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     bwipjs.toBuffer(
//       {
//         bcid: "code128",
//         text: text,
//         scale: 3,
//         height: 10,
//         includetext: true,
//         textxalign: "center",
//       },
//       (err, png) => {
//         if (err) reject(err);
//         else resolve(`data:image/png;base64,${png.toString("base64")}`);
//       }
//     );
//   });
// }

// async function matchProductVariant(sku: string, description: string) {
//   // Try exact SKU match first
//   let variant = await prisma.productVariant.findUnique({
//     where: { sku },
//   });

//   if (variant) return variant;

//   // Try UPC/barcode match
//   variant = await prisma.productVariant.findFirst({
//     where: {
//       OR: [{ upc: sku }, { barcode: sku }],
//     },
//   });

//   if (variant) return variant;

//   // Try fuzzy match on description
//   variant = await prisma.productVariant.findFirst({
//     where: {
//       OR: [
//         { name: { contains: description, mode: "insensitive" } },
//         { sku: { contains: sku, mode: "insensitive" } },
//       ],
//     },
//   });

//   return variant;
// }

// export async function POST(req: Request) {
//   let tempFilePath: string | null = null;

//   try {
//     const formData = await req.formData();
//     const file = formData.get("file") as File | null;
//     const userId = formData.get("userId") as string;
//     const orderId = formData.get("orderId") as string | null;

//     // Get invoice data - CHANGED: vendor fields instead of customer
//     const invoiceNumber = formData.get("invoiceNumber") as string;
//     const vendorName = formData.get("vendorName") as string;
//     const vendorEmail = formData.get("vendorEmail") as string;
//     const vendorAddress = formData.get("vendorAddress") as string;
//     const vendorPhone = formData.get("vendorPhone") as string;
//     const date = formData.get("date") as string;
//     const dueDate = formData.get("dueDate") as string;
//     const tax = parseFloat(formData.get("tax") as string);
//     const shipping = parseFloat(formData.get("shipping") as string) || 0;
//     const fees = parseFloat(formData.get("fees") as string) || 0;
//     const itemsJson = formData.get("items") as string;

//     console.log("Creating invoice:", { invoiceNumber, vendorName });

//     // CHANGED: Validate vendor name instead of customer name
//     if (!invoiceNumber || !vendorName) {
//       return NextResponse.json(
//         { error: "Invoice number and vendor name are required" },
//         { status: 400 }
//       );
//     }

//     const items = JSON.parse(itemsJson);

//     // Calculate totals
//     const subtotal = items.reduce(
//       (sum: number, item: any) => sum + item.quantity * item.unitPrice,
//       0
//     );
//     const total = subtotal + tax + shipping + fees;

//     // Handle file upload if provided
//     let originalInvoiceUrl: string | null = null;

//     if (file) {
//       if (!file.type.startsWith("image/")) {
//         return NextResponse.json(
//           { error: "File must be an image" },
//           { status: 400 }
//         );
//       }

//       // Process image
//       const arrayBuffer = await file.arrayBuffer();
//       const buffer = Buffer.from(arrayBuffer);

//       const optimized = await sharp(buffer)
//         .resize(2048, 2048, { fit: "inside" })
//         .jpeg({ quality: 85 })
//         .toBuffer();

//       console.log("Image optimized, size:", optimized.length);

//       // Save to temp file
//       const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
//       tempFilePath = path.join(
//         tmpdir(),
//         `invoice-${Date.now()}-${sanitizedFileName}.jpg`
//       );

//       await writeFile(tempFilePath, optimized);
//       console.log("Temp file created:", tempFilePath);

//       // Upload to GCS
//       const fileName = `invoices/${Date.now()}-${sanitizedFileName}`;
//       console.log("Uploading to GCS:", fileName);

//       await bucket.upload(tempFilePath, {
//         destination: fileName,
//         metadata: {
//           contentType: "image/jpeg",
//           cacheControl: "public, max-age=31536000",
//         },
//       });

//       console.log("Upload complete");

//       // Clean up temp file
//       await unlink(tempFilePath);
//       tempFilePath = null;

//       originalInvoiceUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${fileName}`;
//     }

//     // Generate invoice barcode
//     const invoiceBarcode = await generateCode128Barcode(invoiceNumber);

//     // Process items - generate barcodes and match products
//     const processedItems = await Promise.all(
//       items.map(async (item: any) => {
//         // Generate SKU barcode
//         const barcode = await generateCode128Barcode(item.sku);

//         // Try to match with existing product variant
//         const variant = await matchProductVariant(item.sku, item.description);

//         return {
//           sku: item.sku,
//           barcode,
//           description: item.description,
//           quantity: parseInt(item.quantity),
//           unitPrice: parseFloat(item.unitPrice),
//           total: parseInt(item.quantity) * parseFloat(item.unitPrice),
//           productVariantId: variant?.id || null,
//         };
//       })
//     );

//     // Verify order exists if provided
//     if (orderId) {
//       const order = await prisma.order.findUnique({
//         where: { id: orderId },
//       });

//       if (!order) {
//         return NextResponse.json({ error: "Order not found" }, { status: 404 });
//       }
//     }

//     // Save to database - CHANGED: vendor fields
//     const invoice = await prisma.invoice.create({
//       data: {
//         invoiceNumber,
//         barcode: invoiceBarcode,
//         date: new Date(date),
//         dueDate: dueDate ? new Date(dueDate) : null,
//         vendorName,
//         vendorEmail: vendorEmail || null,
//         vendorAddress: vendorAddress || null,
//         vendorPhone: vendorPhone || null,
//         subtotal,
//         tax,
//         shipping,
//         fees,
//         total,
//         originalInvoiceUrl,
//         status: "DRAFT",
//         createdBy: userId,
//         orderId: orderId || null,
//         items: {
//           create: processedItems,
//         },
//       },
//       include: {
//         items: {
//           include: {
//             productVariant: true,
//           },
//         },
//         order: true,
//       },
//     });

//     console.log("Invoice created:", invoice.id);

//     return NextResponse.json({
//       success: true,
//       invoice,
//       message: "Invoice created successfully",
//     });
//   } catch (err: any) {
//     console.error("=== Invoice Create Error ===");
//     console.error("Error:", err.message);
//     console.error("Stack:", err.stack);

//     // Clean up temp file if it exists
//     if (tempFilePath) {
//       try {
//         await unlink(tempFilePath);
//         console.log("Temp file cleaned up");
//       } catch (cleanupErr) {
//         console.error("Failed to clean up temp file:", cleanupErr);
//       }
//     }

//     return NextResponse.json(
//       {
//         error: err.message || "Failed to create invoice",
//       },
//       { status: 500 }
//     );
//   }
// }
