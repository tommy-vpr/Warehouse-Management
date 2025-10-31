// components/InvoiceUploader.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, X, Check } from "lucide-react";

interface InvoiceUploaderProps {
  orderId?: string;
  userId: string;
  onSuccess?: (invoice: any) => void;
}

export default function InvoiceUploader({
  orderId,
  userId,
  onSuccess,
}: InvoiceUploaderProps) {
  const [mode, setMode] = useState<"image" | "paste">("image");
  const [snippet, setSnippet] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      if (orderId) formData.append("orderId", orderId);

      const response = await fetch("/api/invoice/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data.invoice);
      onSuccess?.(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      // Handle image paste
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await handleImageSelect(file);
          return;
        }
      }
    }
  };

  const handleSnippetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("snippet", snippet);
      formData.append("userId", userId);
      if (orderId) formData.append("orderId", orderId);

      const response = await fetch("/api/invoice/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Processing failed");
      }

      setResult(data.invoice);
      setSnippet("");
      onSuccess?.(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setPreviewUrl(null);
    setSnippet("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">Generate Invoice</h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload image, paste screenshot (Ctrl+V), or paste invoice text
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex border-b">
          <button
            onClick={() => setMode("image")}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
              mode === "image"
                ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Upload size={18} />
            Upload / Paste Image
          </button>
          <button
            onClick={() => setMode("paste")}
            className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
              mode === "paste"
                ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FileText size={18} />
            Paste Text
          </button>
        </div>

        <div className="p-6">
          {mode === "image" ? (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
                onPaste={handlePaste}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {loading ? (
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  ) : (
                    <Upload className="w-12 h-12 text-gray-400" />
                  )}
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload, drag and drop, or press Ctrl+V to paste
                    screenshot
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, WEBP up to 10MB
                  </p>
                </label>
              </div>

              {previewUrl && !result && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full h-auto rounded-lg border"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                      <div className="text-white text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p>Extracting invoice data...</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSnippetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Text (or Ctrl+V to paste)
                </label>
                <textarea
                  value={snippet}
                  onChange={(e) => setSnippet(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Paste invoice details here...

Example:
Invoice #12345
Date: 2024-01-15
Bill To: Acme Corp
123 Main St

Items:
- Skwezed Banana Ice 100ml 0mg x10 @ $12.99
- Skwezed Strawberry 30ml 50mg x5 @ $18.99

Subtotal: $224.85
Tax: $18.99
Total: $243.84"
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !snippet.trim()}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Generate Invoice</>
                )}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
              <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">
                  Invoice created successfully!
                </span>
              </div>

              <div className="border rounded-lg overflow-hidden">
                {/* Invoice Header */}
                <div className="bg-gray-50 p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {result.invoiceNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {result.customerName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(result.date).toLocaleDateString()}
                      </p>
                    </div>
                    {result.barcode && (
                      <img
                        src={result.barcode}
                        alt="Invoice Barcode"
                        className="h-16"
                      />
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="p-4">
                  <h4 className="font-medium mb-3 text-gray-700">Items</h4>
                  <div className="space-y-2">
                    {result.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        {item.barcode && (
                          <img
                            src={item.barcode}
                            alt={`SKU ${item.sku}`}
                            className="h-10"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.description}
                          </p>
                          <p className="text-xs text-gray-600">
                            SKU: {item.sku}
                            {item.productVariant && (
                              <span className="text-green-600 ml-2">
                                ✓ Matched to inventory
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity} × ${item.unitPrice}
                          </p>
                        </div>
                        <p className="font-medium text-sm">${item.total}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t p-4 bg-gray-50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${result.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>${result.tax}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold">${result.total}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t flex gap-2">
                  <button
                    onClick={() =>
                      window.open(`/api/invoice/${result.id}/pdf`, "_blank")
                    }
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    New Invoice
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
