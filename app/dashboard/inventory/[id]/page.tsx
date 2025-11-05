// app/dashboard/invoice/[id]/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import {
  FileText,
  Download,
  ArrowLeft,
  Image as ImageIcon,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoice/${id}`);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <p className="text-gray-500 dark:text-gray-400">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <Link
            href="/dashboard/invoice"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
          <Button
            onClick={() => window.open(`/api/invoice/${id}/pdf`, "_blank")}
            className="cursor-pointer w-full sm:w-auto"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Invoice Card */}
        <Card>
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 sm:p-6 border-b">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {new Date(invoice.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {invoice.barcode && (
                <Image
                  src={invoice.barcode}
                  alt="Invoice Barcode"
                  width={160}
                  height={48}
                  className="bg-white p-2 rounded w-full sm:w-auto max-w-[200px]"
                />
              )}
            </div>
          </div>

          {/* Original Invoice Image */}
          {invoice.originalInvoiceUrl && (
            <div className="p-4 sm:p-6 border-b bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Original Invoice
              </h2>
              <div className="relative w-full overflow-hidden rounded border">
                <Image
                  src={invoice.originalInvoiceUrl}
                  alt="Original Invoice"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          )}

          {/* Customer Info */}
          <CardContent className="p-4 sm:p-6 border-b bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Bill To
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                  {invoice.customerName}
                </p>
              </div>
              {invoice.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all">
                    {invoice.customerEmail}
                  </p>
                </div>
              )}
              {invoice.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {invoice.customerPhone}
                  </p>
                </div>
              )}
              {invoice.customerAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {invoice.customerAddress}
                  </p>
                </div>
              )}
            </div>

            {invoice.order && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Linked Order:{" "}
                  <Link
                    href={`/order/${invoice.order.id}`}
                    className="font-medium text-blue-600 hover:underline break-all"
                  >
                    {invoice.order.orderNumber}
                  </Link>
                </p>
              </div>
            )}
          </CardContent>

          {/* Items */}
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Items
            </h2>
            <div className="space-y-3">
              {invoice.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  {/* Barcode - Full width on mobile */}
                  {item.barcode && (
                    <div className="w-full sm:w-auto">
                      <Image
                        src={item.barcode}
                        alt={`SKU ${item.sku}`}
                        width={100}
                        height={40}
                        className="bg-white p-1 rounded mx-auto sm:mx-0"
                      />
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0 w-full">
                    <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                      {item.description}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        SKU: {item.sku}
                      </p>
                      {item.productVariant && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-fit"
                        >
                          ✓ In Inventory
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Quantity: {item.quantity} × ${item.unitPrice}
                    </p>
                  </div>

                  {/* Price - Right aligned on desktop, left on mobile */}
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <p className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">
                      ${item.total}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>

          {/* Totals */}
          <CardContent className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t">
            <div className="w-full sm:max-w-sm sm:ml-auto space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Subtotal
                </span>
                <span className="font-medium">${invoice.subtotal}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span className="font-medium">${invoice.tax}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                  Total
                </span>
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  ${invoice.total}
                </span>
              </div>
            </div>
          </CardContent>

          {/* Footer */}
          <CardContent className="px-4 sm:px-6 py-4 bg-gray-100 dark:bg-gray-900/50 border-t">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>
                  Created {new Date(invoice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Badge
                className={
                  invoice.status === "PAID"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : invoice.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                }
              >
                {invoice.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
