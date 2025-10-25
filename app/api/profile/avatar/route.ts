// app/api/profile/avatar/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

export async function POST(req: Request) {
  let tempFilePath: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    console.log("Avatar upload started:", {
      userId: session.user.id,
      fileName: file?.name,
    });

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Process image - resize to 256x256 for avatars
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const optimized = await sharp(buffer)
      .resize(256, 256, { fit: "cover" }) // Square crop for avatar
      .jpeg({ quality: 85 })
      .toBuffer();

    console.log("Avatar image optimized, size:", optimized.length);

    // Save to temp file
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    tempFilePath = path.join(
      tmpdir(),
      `avatar-${Date.now()}-${sanitizedFileName}.jpg`
    );

    await writeFile(tempFilePath, optimized);
    console.log("Temp file created:", tempFilePath);

    // Initialize GCS
    const { Storage } = await import("@google-cloud/storage");

    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY,
      },
    });

    const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);
    const fileName = `avatars/${
      session.user.id
    }/${Date.now()}-${sanitizedFileName}`;

    console.log("Uploading to GCS:", fileName);

    // Upload from file
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

    // Get public URL (bucket should already be configured for public access)
    const publicUrl = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${fileName}`;

    console.log("Public URL:", publicUrl);

    // Get current user to delete old avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    // Delete old avatar if it exists
    if (
      currentUser?.image &&
      currentUser.image.includes("storage.googleapis.com")
    ) {
      try {
        const oldFileName = currentUser.image.split(
          `${process.env.GCP_BUCKET_NAME}/`
        )[1];
        if (oldFileName) {
          const oldFile = bucket.file(oldFileName);
          await oldFile.delete();
          console.log("Old avatar deleted:", oldFileName);
        }
      } catch (error) {
        console.error("Failed to delete old avatar:", error);
        // Don't fail the request if old file deletion fails
      }
    }

    // Update user's image in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: publicUrl },
    });

    console.log("Database updated with new avatar URL");

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
    });
  } catch (err: any) {
    console.error("=== Avatar Upload Error ===");
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
        error: err.message || "Avatar upload failed",
      },
      { status: 500 }
    );
  }
}
