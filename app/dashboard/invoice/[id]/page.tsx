// app/dashboard/invoice/[id]/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { use, useState } from "react";
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
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoice/${id}`);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return res.json();
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSku(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedSku(null), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please try again",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/invoice"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Invoices
          </Link>
          <Button
            variant={"outline"}
            onClick={() => window.open(`/api/invoice/${id}/pdf`, "_blank")}
            className="cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Invoice Card */}
        <Card>
          {/* Header Section */}
          <div className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={"outline"}>PO</Badge>
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </h1>
                  <button
                    onClick={() =>
                      copyToClipboard(invoice.invoiceNumber, "Invoice number")
                    }
                    className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded transition-colors"
                    title="Copy invoice number"
                  >
                    {copiedSku === invoice.invoiceNumber ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(invoice.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {invoice.barcodeValue && (
                <div className="text-right">
                  <Image
                    src={`/api/invoice/barcode/generate?text=${invoice.barcodeValue}`}
                    alt="Invoice Barcode"
                    width={200}
                    height={60}
                    className="bg-white p-2 rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {invoice.barcodeValue}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Original Invoice Image */}
          {invoice.originalInvoiceUrl && (
            <div className="p-6 border-b bg-gray-50 dark:bg-transparent">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Original Invoice
              </h2>
              <div className="relative">
                <Image
                  src={invoice.originalInvoiceUrl}
                  alt="Original Invoice"
                  width={800}
                  height={600}
                  className="rounded border max-w-full h-auto"
                />
              </div>
            </div>
          )}

          {/* Vendor Info */}
          <CardContent className="p-6 border-b bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Vendor
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <p className="font-medium text-gray-900 dark:text-white">
                  {invoice.vendorName}
                </p>
              </div>
              {invoice.vendorEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {invoice.vendorEmail}
                  </p>
                </div>
              )}
              {invoice.vendorPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {invoice.vendorPhone}
                  </p>
                </div>
              )}
              {invoice.vendorAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {invoice.vendorAddress}
                  </p>
                </div>
              )}
            </div>

            {invoice.order && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Linked Order:{" "}
                  <Link
                    href={`/order/${invoice.order.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {invoice.order.orderNumber}
                  </Link>
                </p>
              </div>
            )}
          </CardContent>

          {/* Items */}
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Items
            </h2>
            <div className="space-y-3">
              {invoice.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg"
                >
                  {item.barcodeValue && (
                    <div className="flex flex-col items-center">
                      <Image
                        src={`/api/invoice/barcode/generate?text=${item.barcodeValue}`}
                        alt={`SKU ${item.sku}`}
                        width={100}
                        height={40}
                        className="bg-white p-1 rounded"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {item.barcodeValue}
                      </p>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          SKU: {item.sku}
                        </p>
                        <button
                          onClick={() => copyToClipboard(item.sku, "SKU")}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Copy SKU"
                        >
                          {copiedSku === item.sku ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {item.productVariant && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        >
                          ✓ In Inventory
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Quantity: {item.quantity} × ${item.unitPrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ${item.total}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>

          {/* Totals */}
          <CardContent className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t">
            <div className="max-w-sm ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Subtotal
                </span>
                <span className="font-medium">${invoice.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span className="font-medium">${invoice.tax}</span>
              </div>
              {parseFloat(invoice.shipping) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Shipping
                  </span>
                  <span className="font-medium">${invoice.shipping}</span>
                </div>
              )}
              {parseFloat(invoice.fees) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Fees</span>
                  <span className="font-medium">${invoice.fees}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ${invoice.total}
                </span>
              </div>
            </div>
          </CardContent>

          {/* Footer */}
          <CardContent className="px-6 py-4 bg-gray-100 dark:bg-gray-900/50 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>
                  Created {new Date(invoice.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Badge
                className={
                  invoice.status === "PAID"
                    ? "bg-green-100 text-green-700"
                    : invoice.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
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
