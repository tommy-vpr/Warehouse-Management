export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the image
    const image = await prisma.orderImage.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from database
    await prisma.orderImage.delete({
      where: { id },
    });

    // Optional: Delete from GCS
    // Extract filename from URL and delete blob
    try {
      const { Storage } = await import("@google-cloud/storage");
      const storage = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
      });
      const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);

      // Extract file path from signed URL
      const urlMatch = image.url.match(/orders\/[^?]+/);
      if (urlMatch) {
        const filePath = urlMatch[0];
        await bucket.file(filePath).delete();
      }
    } catch (gcsError) {
      console.error("Failed to delete from GCS:", gcsError);
      // Continue anyway - database record is deleted
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: err.message || "Delete failed" },
      { status: 500 }
    );
  }
}
