// app/api/upload/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

export async function POST(req: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderId = formData.get("orderId") as string;
    const reference = formData.get("reference") as string | null;

    console.log("Upload started:", { orderId, fileName: file?.name });

    if (!file || !orderId) {
      return NextResponse.json(
        { error: "Missing file or orderId" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Process image
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const optimized = await sharp(buffer)
      .rotate()
      .resize(1024, 1024, { fit: "inside" })
      .jpeg({ quality: 75 })
      .toBuffer();

    console.log("Image optimized, size:", optimized.length);

    // Save to temp file
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    tempFilePath = path.join(
      tmpdir(),
      `upload-${Date.now()}-${sanitizedFileName}.jpg`
    );

    await writeFile(tempFilePath, optimized);
    console.log("Temp file created:", tempFilePath);

    // Initialize GCS
    const { Storage } = await import("@google-cloud/storage");

    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY, // No need to replace \n
      },
    });

    const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);
    const fileName = `orders/${orderId}/${Date.now()}-${sanitizedFileName}`;

    console.log("Uploading to GCS:", fileName);

    // Upload from file (most reliable method)
    await bucket.upload(tempFilePath, {
      destination: fileName,
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000",
      },
    });

    console.log("Upload complete, cleaning up temp file");

    // Clean up temp file
    await unlink(tempFilePath);
    tempFilePath = null;

    // Get the file reference
    // const blob = bucket.file(fileName);

    // ✅ FIX: Max 7 days expiry (604800 seconds)
    // const [signedUrl] = await blob.getSignedUrl({
    //   version: "v4",
    //   action: "read",
    //   expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (max allowed)
    // });

    // await blob.makePublic();
    const publicUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${fileName}`;

    console.log("Public URL:", publicUrl);
    // Save to database
    const image = await prisma.orderImage.create({
      data: {
        orderId: order.id,
        url: publicUrl,
        reference: reference || order.orderNumber,
      },
    });

    console.log("Database record created:", image.id);

    return NextResponse.json({
      success: true,
      image: {
        id: image.id,
        url: image.url,
        createdAt: image.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("=== Upload Error ===");
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
        error: err.message || "Upload failed",
      },
      { status: 500 }
    );
  }
}
