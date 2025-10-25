// app/dashboard/inventory/receive/scan/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  BarcodeScannerIcon as BarcodeIcon,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  sku: string;
  name: string;
  upc?: string;
}

interface PurchaseOrder {
  id: string;
  reference: string;
  vendor_name: string;
  line_items: Array<{
    sku: string;
    product_name: string;
    quantity_ordered: number;
    upc?: string;
  }>;
}

interface TallyCount {
  [sku: string]: number;
}

export default function BarcodeScanReceivingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState<"scan-po" | "scan-products" | "review">(
    "scan-po"
  );
  const [poBarcode, setPOBarcode] = useState("");
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [tallyCounts, setTallyCounts] = useState<TallyCount>({});
  const [productScanInput, setProductScanInput] = useState("");
  const [lastScannedSKU, setLastScannedSKU] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const poScanRef = useRef<HTMLInputElement>(null);
  const productScanRef = useRef<HTMLInputElement>(null);

  // Auto-focus on input fields
  useEffect(() => {
    if (step === "scan-po" && poScanRef.current) {
      poScanRef.current.focus();
    } else if (step === "scan-products" && productScanRef.current) {
      productScanRef.current.focus();
    }
  }, [step]);

  // Clear last scanned highlight after 2 seconds
  useEffect(() => {
    if (lastScannedSKU) {
      const timer = setTimeout(() => setLastScannedSKU(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastScannedSKU]);

  // Clear scan error after 3 seconds
  useEffect(() => {
    if (scanError) {
      const timer = setTimeout(() => setScanError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [scanError]);

  // Scan PO barcode
  const scanPOMutation = useMutation({
    mutationFn: async (barcodeValue: string) => {
      const res = await fetch("/api/inventory/po-barcode/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcodeValue }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to scan PO barcode");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setPO(data.po);
      setStep("scan-products");
      toast({
        title: "✅ PO Loaded",
        description: `Ready to receive PO ${data.po.reference}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "❌ Scan Failed",
        description: error.message,
      });
    },
  });

  // Scan product UPC/barcode
  const scanProductMutation = useMutation({
    mutationFn: async (upc: string) => {
      const res = await fetch("/api/inventory/po-barcode/scan-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upc }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Product not found");
      }

      return res.json();
    },
    onSuccess: (data) => {
      const sku = data.product.sku;

      // Check if this SKU is in the PO
      const isInPO = po?.line_items.some((item) => item.sku === sku);

      if (!isInPO) {
        setScanError(`⚠️ ${data.product.name} is not in this PO`);
        // Still allow counting but warn
      }

      // Increment tally
      setTallyCounts((prev) => ({
        ...prev,
        [sku]: (prev[sku] || 0) + 1,
      }));

      setLastScannedSKU(sku);
      setProductScanInput("");

      // Beep sound (optional)
      if (typeof window !== "undefined") {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = isInPO ? 800 : 400; // Higher beep if in PO
        gainNode.gain.value = 0.3;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    },
    onError: (error: Error) => {
      setScanError(error.message);
      setProductScanInput("");
    },
  });

  // Submit receiving session
  const submitMutation = useMutation({
    mutationFn: async (counts: TallyCount) => {
      if (!po) throw new Error("No PO loaded");

      const expectedQuantities: any = { metadata: {} };
      po.line_items.forEach((item) => {
        const trimmedSku = item.sku.trim();
        expectedQuantities[trimmedSku] = item.quantity_ordered;
        expectedQuantities.metadata[trimmedSku] = {
          name: item.product_name,
        };
      });

      const res = await fetch("/api/inventory/receive/po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poId: po.id,
          poReference: po.reference,
          vendor: po.vendor_name,
          lineCounts: counts,
          expectedQuantities,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit receiving");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Submitted for Approval!",
        description: "Receiving session created. Awaiting manager approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-receiving"] });
      router.push("/dashboard/inventory/receive/pending");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "❌ Failed to Submit",
        description: error.message,
      });
    },
  });

  const handlePOScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (poBarcode.trim()) {
      scanPOMutation.mutate(poBarcode.trim());
    }
  };

  const handleProductScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (productScanInput.trim()) {
      scanProductMutation.mutate(productScanInput.trim());
    }
  };

  const handleDone = () => {
    setStep("review");
  };

  const handleBackToScanning = () => {
    setStep("scan-products");
  };

  const handleSubmit = () => {
    submitMutation.mutate(tallyCounts);
  };

  const handleManualAdjust = (sku: string, delta: number) => {
    setTallyCounts((prev) => ({
      ...prev,
      [sku]: Math.max(0, (prev[sku] || 0) + delta),
    }));
  };

  const totalScanned = Object.values(tallyCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const itemsCounted = Object.keys(tallyCounts).filter(
    (sku) => tallyCounts[sku] > 0
  ).length;

  // STEP 1: Scan PO Barcode
  if (step === "scan-po") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <BarcodeIcon className="w-10 h-10 text-blue-600" />
            </div>
            <CardTitle className="text-3xl">Scan PO Barcode</CardTitle>
            <p className="text-gray-600 mt-2">
              Scan the barcode on the receiving label to get started
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePOScan} className="space-y-4">
              <div>
                <Input
                  ref={poScanRef}
                  type="text"
                  placeholder="Scan or enter PO barcode..."
                  value={poBarcode}
                  onChange={(e) => setPOBarcode(e.target.value)}
                  className="text-lg h-14"
                  disabled={scanPOMutation.isPending}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={!poBarcode.trim() || scanPOMutation.isPending}
              >
                {scanPOMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading PO...
                  </>
                ) : (
                  <>
                    <BarcodeIcon className="w-5 h-5 mr-2" />
                    Load PO
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Don't have a barcode label?</p>
              <button
                onClick={() => router.push("/dashboard/inventory/receive/po")}
                className="text-blue-600 hover:underline mt-1"
              >
                Use manual receiving instead
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 2: Scan Products
  if (step === "scan-products" && po) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Receiving: {po.reference}
                </h1>
                <p className="text-gray-600">{po.vendor_name}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {totalScanned}
                </div>
                <div className="text-sm text-gray-600">units scanned</div>
              </div>
            </div>
          </div>

          {/* Scan Error Banner */}
          {scanError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 animate-shake">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                <p className="text-red-700 font-medium">{scanError}</p>
              </div>
            </div>
          )}

          {/* Scanner Input */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <form onSubmit={handleProductScan}>
                <div className="flex items-center gap-4">
                  <BarcodeIcon className="w-8 h-8 text-gray-400" />
                  <Input
                    ref={productScanRef}
                    type="text"
                    placeholder="Scan product UPC or barcode..."
                    value={productScanInput}
                    onChange={(e) => setProductScanInput(e.target.value)}
                    className="text-xl h-16 flex-1"
                    disabled={scanProductMutation.isPending}
                    autoFocus
                  />
                  {scanProductMutation.isPending && (
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Items List */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {po.line_items.map((item) => {
              const counted = tallyCounts[item.sku] || 0;
              const expected = item.quantity_ordered;
              const isComplete = counted >= expected;
              const isHighlighted = lastScannedSKU === item.sku;

              return (
                <Card
                  key={item.sku}
                  className={`transition-all ${
                    isHighlighted
                      ? "ring-4 ring-green-500 scale-[1.02] shadow-lg"
                      : isComplete
                      ? "border-green-500 bg-green-50"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isComplete && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          )}
                          <h3 className="font-semibold">{item.product_name}</h3>
                        </div>
                        <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                        {item.upc && (
                          <p className="text-xs text-gray-500">
                            UPC: {item.upc}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-3xl font-bold ${
                            counted > expected
                              ? "text-orange-600"
                              : counted === expected
                              ? "text-green-600"
                              : "text-gray-900"
                          }`}
                        >
                          {counted}
                        </div>
                        <div className="text-sm text-gray-600">
                          of {expected}
                        </div>
                      </div>
                    </div>

                    {/* Manual Adjustment */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualAdjust(item.sku, -1)}
                        disabled={counted === 0}
                      >
                        -
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualAdjust(item.sku, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Done Button */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">
                  {itemsCounted} of {po.line_items.length} items counted
                </div>
                <div className="text-xl font-bold">
                  {totalScanned} total units
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleDone}
                className="bg-green-600 hover:bg-green-700 text-lg px-8"
              >
                Done Scanning
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Review & Submit
  if (step === "review" && po) {
    const hasVariances = po.line_items.some(
      (item) => (tallyCounts[item.sku] || 0) !== item.quantity_ordered
    );

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Review Counts</CardTitle>
              <p className="text-gray-600">
                Review your counts before submitting for approval
              </p>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {po.line_items.length}
                    </div>
                    <div className="text-sm text-gray-600">Total SKUs</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {totalScanned}
                    </div>
                    <div className="text-sm text-gray-600">Units Counted</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {itemsCounted}
                    </div>
                    <div className="text-sm text-gray-600">SKUs Counted</div>
                  </div>
                </div>
              </div>

              {/* Variance Warning */}
              {hasVariances && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mr-3" />
                    <p className="text-yellow-700 font-medium">
                      Some items have count variances from expected quantities
                    </p>
                  </div>
                </div>
              )}

              {/* Items Review */}
              <div className="space-y-3 mb-6">
                {po.line_items.map((item) => {
                  const counted = tallyCounts[item.sku] || 0;
                  const expected = item.quantity_ordered;
                  const variance = counted - expected;

                  return (
                    <div
                      key={item.sku}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-sm text-gray-600">
                              Expected
                            </div>
                            <div className="font-semibold">{expected}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Counted</div>
                            <div
                              className={`font-semibold ${
                                variance !== 0 ? "text-orange-600" : ""
                              }`}
                            >
                              {counted}
                            </div>
                          </div>
                          {variance !== 0 && (
                            <Badge
                              variant={variance > 0 ? "default" : "destructive"}
                            >
                              {variance > 0 ? "+" : ""}
                              {variance}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBackToScanning}
                  disabled={submitMutation.isPending}
                  className="flex-1"
                >
                  Back to Scanning
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit for Approval
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
