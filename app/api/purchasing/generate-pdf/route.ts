import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePDF } from "@/utils/pdf-generator";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { poNumber, supplier, expectedDate, notes, items, totalCost } = data;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .po-number { font-size: 24px; font-weight: bold; color: #2563eb; }
            .details { margin: 20px 0; }
            .details-row { display: flex; justify-content: space-between; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #f9fafb; }
            .notes { margin-top: 30px; padding: 15px; background-color: #f3f4f6; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Purchase Order</h1>
            <div class="po-number">${poNumber}</div>
          </div>

          <div class="details">
            <div class="details-row">
              <div><strong>Supplier:</strong> ${supplier}</div>
              <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            ${
              expectedDate
                ? `
              <div class="details-row">
                <div><strong>Expected Delivery:</strong> ${new Date(
                  expectedDate
                ).toLocaleDateString()}</div>
              </div>
            `
                : ""
            }
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Cost</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item: any) => `
                <tr>
                  <td>
                    ${item.productName}
                    ${
                      item.volume
                        ? `<br><small>${item.volume}${
                            item.strength ? " • " + item.strength : ""
                          }</small>`
                        : ""
                    }
                  </td>
                  <td>${item.sku}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">$${item.unitCost.toFixed(2)}</td>
                  <td class="text-right">$${item.totalCost.toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
              <tr class="total-row">
                <td colspan="4" class="text-right">TOTAL:</td>
                <td class="text-right">$${totalCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          ${
            notes
              ? `
            <div class="notes">
              <strong>Notes:</strong><br>
              ${notes}
            </div>
          `
              : ""
          }

          <div style="margin-top: 60px; text-align: center; color: #6b7280;">
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    const pdfBuffer = await generatePDF(htmlContent);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${poNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
