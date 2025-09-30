// utils/cycle-count-report-template.ts
import { CampaignAnalytics } from "./cycle-count-analytics";

function generateHeader(
  campaignName: string,
  reportDate: string,
  reportTime: string,
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): string {
  return `
    <div class="header">
      <h1>Cycle Count Report</h1>
      <p><strong>${campaignName}</strong></p>
      <p>Generated on ${reportDate}<br/><span style="font-size: 12px; color: #9ca3af;">${reportTime}</span></p>
      <p>Campaign Period: ${startDate} - ${endDate}<br/><span style="font-size: 12px; color: #9ca3af;">${startTime} - ${endTime}</span></p>
    </div>
  `;
}

function generateExecutiveSummary(analytics: CampaignAnalytics): string {
  return `
    <div class="section">
      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="metric-card">
          <div class="metric-value">${analytics.counts.total}</div>
          <div class="metric-label">Total Tasks</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${analytics.campaign.accuracy.toFixed(
            1
          )}%</div>
          <div class="metric-label">Accuracy</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${analytics.counts.variances}</div>
          <div class="metric-label">Total Variances</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">$${analytics.campaign.varianceValue.toFixed(
            2
          )}</div>
          <div class="metric-label">Variance Value</div>
        </div>
      </div>
    </div>
  `;
}

function generateVarianceAnalysis(analytics: CampaignAnalytics): string {
  return `
    <div class="section">
      <h2>Variance Analysis</h2>
      <div class="variance-grid">
        <div class="variance-card positive">
          <div class="metric-value" style="color: #059669;">${analytics.counts.positive}</div>
          <div class="metric-label">Positive Variances</div>
        </div>
        <div class="variance-card negative">
          <div class="metric-value" style="color: #dc2626;">${analytics.counts.negative}</div>
          <div class="metric-label">Negative Variances</div>
        </div>
        <div class="variance-card high">
          <div class="metric-value" style="color: #f59e0b;">${analytics.counts.high}</div>
          <div class="metric-label">High Variances (>10%)</div>
        </div>
      </div>
    </div>
  `;
}

function generateLocationPerformance(analytics: CampaignAnalytics): string {
  const locationRows = Object.entries(analytics.locationStats)
    .map(
      ([location, stats]: [string, any]) => `
    <tr>
      <td><strong>${location}</strong></td>
      <td>${stats.total}</td>
      <td>${stats.completed}</td>
      <td>${stats.variances}</td>
      <td>${stats.accuracy.toFixed(1)}%</td>
    </tr>
  `
    )
    .join("");

  return `
    <div class="section">
      <h2>Location Performance</h2>
      <table>
        <thead>
          <tr>
            <th>Location</th>
            <th>Total Tasks</th>
            <th>Completed</th>
            <th>Variances</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${locationRows}
        </tbody>
      </table>
    </div>
  `;
}

function generateTopVarianceItems(analytics: CampaignAnalytics): string {
  const varianceRows = analytics.topVarianceItems
    .map(
      (task: any) => `
    <tr>
      <td>${task.taskNumber}</td>
      <td>${task.productVariant?.product?.name || "Location Count"}</td>
      <td>${task.location.name}</td>
      <td>${task.systemQuantity}</td>
      <td>${task.countedQuantity || "-"}</td>
      <td class="${
        task.variance > 0 ? "positive-variance" : "negative-variance"
      }">
        ${task.variance > 0 ? "+" : ""}${task.variance}
      </td>
      <td>${
        task.variancePercentage ? task.variancePercentage.toFixed(1) + "%" : "-"
      }</td>
    </tr>
  `
    )
    .join("");

  return `
    <div class="section">
      <h2>Top Variance Items</h2>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Product</th>
            <th>Location</th>
            <th>System Qty</th>
            <th>Counted Qty</th>
            <th>Variance</th>
            <th>Variance %</th>
          </tr>
        </thead>
        <tbody>
          ${varianceRows}
        </tbody>
      </table>
    </div>
  `;
}

function generateRecommendations(analytics: CampaignAnalytics): string {
  if (analytics.counts.variances === 0) return "";

  const recommendations = [];

  if (analytics.counts.negative > 0) {
    recommendations.push(
      "Investigate negative variances for potential theft, damage, or process issues"
    );
  }

  if (analytics.counts.positive > 0) {
    recommendations.push(
      "Review positive variances for receiving errors or unreported receipts"
    );
  }

  if (analytics.counts.high > 0) {
    recommendations.push(
      "Prioritize high variance items for immediate investigation and correction"
    );
  }

  if (analytics.campaign.accuracy < 95) {
    recommendations.push(
      "Consider additional training for count procedures due to low accuracy"
    );
  }

  recommendations.push(
    "Update inventory records based on confirmed count results"
  );
  recommendations.push("Schedule follow-up counts for high-variance locations");

  const recommendationList = recommendations
    .map((rec) => `<li>${rec}</li>`)
    .join("");

  return `
    <div class="recommendations">
      <h3>Recommendations</h3>
      <ul>
        ${recommendationList}
      </ul>
    </div>
  `;
}

function generateFooter(campaignId: string, reportDate: string): string {
  return `
    <div class="footer">
      <p>This report was automatically generated by the Cultivated WMS</p>
      <p>Report ID: ${campaignId} | Generated: ${reportDate}</p>
    </div>
  `;
}

export function generateCycleCountReportHTML(
  campaign: any,
  analytics: CampaignAnalytics
): string {
  const now = new Date();
  const reportDate = now.toLocaleDateString();
  const reportTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const startDate = new Date(campaign.startDate).toLocaleDateString();
  const startTime = new Date(campaign.startDate).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endDate = campaign.endDate
    ? new Date(campaign.endDate).toLocaleDateString()
    : "Ongoing";
  const endTime = campaign.endDate
    ? new Date(campaign.endDate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cycle Count Report - ${campaign.name}</title>
      <style>
        ${getReportStyles()}
      </style>
    </head>
    <body>
      ${generateHeader(
        campaign.name,
        reportDate,
        reportTime,
        startDate,
        startTime,
        endDate,
        endTime
      )}
      ${generateExecutiveSummary(analytics)}
      ${generateVarianceAnalysis(analytics)}
      ${generateLocationPerformance(analytics)}
      ${generateTopVarianceItems(analytics)}
      ${generateRecommendations(analytics)}
      ${generateFooter(campaign.id, reportDate)}
    </body>
    </html>
  `;
}

function getReportStyles(): string {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #1e40af;
      margin: 0;
      font-size: 28px;
    }
    
    .header p {
      color: #6b7280;
      margin: 5px 0;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #1e40af;
      margin: 0;
    }
    
    .metric-label {
      color: #6b7280;
      font-size: 14px;
      margin: 5px 0 0 0;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section h2 {
      color: #1e40af;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .variance-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .variance-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 15px;
      text-align: center;
    }
    
    .variance-card.positive {
      border-left: 4px solid #10b981;
    }
    
    .variance-card.negative {
      border-left: 4px solid #ef4444;
    }
    
    .variance-card.high {
      border-left: 4px solid #f59e0b;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px;
      text-align: left;
      white-space: nowrap;
    }
    
    th {
      background: #f8fafc;
      font-weight: 600;
      color: #374151;
      font-size: 10px;
    }
    
    .positive-variance { color: #059669; font-weight: 600; }
    .negative-variance { color: #dc2626; font-weight: 600; }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    
    .recommendations {
      background: #f5f5f5;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .recommendations h3 {
      color: #333;
      margin-top: 0;
    }
    
    .recommendations ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .recommendations li {
      margin-bottom: 8px;
    }
    
    @page {
      margin: 20mm 15mm;
    }
  `;
}
