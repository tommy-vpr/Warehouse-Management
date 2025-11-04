// lib/utils/barcodeGenerator.ts
// Generate barcodes for RMA numbers on-the-fly
import bwipjs from "bwip-js";

export async function generateRMABarcode(rmaNumber: string): Promise<string> {
  try {
    // Generate barcode as PNG buffer
    const png = await bwipjs.toBuffer({
      bcid: "code128", // Barcode type (Code 128 - good for alphanumeric)
      text: rmaNumber, // Text to encode: "RMA-2025-0001"
      scale: 3, // 3x scaling factor
      height: 10, // Bar height, in millimeters
      includetext: true, // Show human-readable text
      textxalign: "center", // Center the text
    });

    // Convert to base64 for embedding in HTML/emails
    const base64 = png.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("Failed to generate barcode:", error);
    throw new Error("Barcode generation failed");
  }
}
