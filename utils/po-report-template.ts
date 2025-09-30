interface POItem {
  productName: string;
  sku: string;
  volume?: string | null;
  strength?: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface POData {
  poNumber: string;
  supplier: string;
  expectedDate?: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
  totalCost: number;
  items: POItem[];
}

export function generatePOReportHTML(po: POData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px;
            color: #1f2937;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          .po-number { 
            font-size: 28px; 
            font-weight: bold; 
            color: #2563eb;
            margin: 10px 0;
          }
          .company-name {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .details-grid { 
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
          }
          .detail-item {
            margin-bottom: 10px;
          }
          .detail-label { 
            font-weight: bold; 
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .detail-value {
            font-size: 16px;
            color: #1f2937;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #e5e7eb; 
            padding: 14px; 
            text-align: left;
          }
          th { 
            background-color: #f3f4f6; 
            font-weight: bold;
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
          }
          td {
            font-size: 14px;
          }
          .product-name {
            font-weight: 600;
            color: #1f2937;
          }
          .product-details {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          .text-right { text-align: right; }
          .total-row { 
            font-weight: bold; 
            background-color: #f9fafb;
            font-size: 16px;
          }
          .notes { 
            margin-top: 30px; 
            padding: 20px; 
            background-color: #fef3c7; 
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
          }
          .notes-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 10px;
          }
          .notes-content {
            color: #78350f;
            line-height: 1.6;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .signature-section {
            margin-top: 60px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-box {
            border-top: 2px solid #1f2937;
            padding-top: 10px;
          }
          .signature-label {
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">VPR COLLECTION</div>
          <div class="po-number">PURCHASE ORDER</div>
          <div class="po-number">${po.poNumber}</div>
        </div>

        <div class="details-grid">
          <div>
            <div class="detail-item">
              <div class="detail-label">Supplier</div>
              <div class="detail-value">${po.supplier}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Order Date</div>
              <div class="detail-value">${new Date(
                po.createdAt
              ).toLocaleDateString()}</div>
            </div>
          </div>
          <div>
            ${
              po.expectedDate
                ? `
              <div class="detail-item">
                <div class="detail-label">Expected Delivery</div>
                <div class="detail-value">${new Date(
                  po.expectedDate
                ).toLocaleDateString()}</div>
              </div>
            `
                : ""
            }
            <div class="detail-item">
              <div class="detail-label">Created By</div>
              <div class="detail-value">${po.createdBy}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40%">Product</th>
              <th style="width: 20%">SKU</th>
              <th class="text-right" style="width: 13%">Quantity</th>
              <th class="text-right" style="width: 13%">Unit Cost</th>
              <th class="text-right" style="width: 14%">Total</th>
            </tr>
          </thead>
          <tbody>
            ${po.items
              .map(
                (item) => `
              <tr>
                <td>
                  <div class="product-name">${item.productName}</div>
                  ${
                    item.volume || item.strength
                      ? `
                    <div class="product-details">
                      ${item.volume || ""} ${
                          item.volume && item.strength ? "•" : ""
                        } ${item.strength || ""}
                    </div>
                  `
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
              <td class="text-right">$${po.totalCost.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        ${
          po.notes
            ? `
          <div class="notes">
            <div class="notes-title">Notes:</div>
            <div class="notes-content">${po.notes}</div>
          </div>
        `
            : ""
        }

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-label">Authorized By</div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Date</div>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>This is a computer-generated document</p>
        </div>
      </body>
    </html>
  `;
}
