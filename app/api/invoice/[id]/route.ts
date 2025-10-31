// app/api/invoice/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
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
          include: {
            productVariant: true,
          },
        },
        order: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: body.status,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Delete from GCS if image exists
    if (invoice.originalInvoiceUrl) {
      try {
        const { Storage } = await import("@google-cloud/storage");
        const storage = new Storage({
          projectId: process.env.GCP_PROJECT_ID,
          credentials: {
            client_email: process.env.GCP_CLIENT_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY,
          },
        });
        const bucket = storage.bucket(process.env.GCP_BUCKET_NAME!);

        const urlMatch = invoice.originalInvoiceUrl.match(/invoices\/[^?]+/);
        if (urlMatch) {
          await bucket.file(urlMatch[0]).delete();
        }
      } catch (gcsError) {
        console.error("Failed to delete from GCS:", gcsError);
      }
    }

    // Delete from database (cascade will delete items)
    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
