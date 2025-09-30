"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, Download, Loader2 } from "lucide-react";

interface POItem {
  productVariantId: string;
  productName: string;
  sku: string;
  volume?: string | null;
  strength?: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export default function CreatePurchaseOrder() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [supplier, setSupplier] = useState(searchParams.get("supplier") || "");
  const [poNumber, setPoNumber] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Fetch pre-selected items if coming from reorders
  const itemIds = searchParams.get("items")?.split(",") || [];

  const { data: preloadedItems } = useQuery({
    queryKey: ["po-items", itemIds],
    queryFn: async () => {
      if (itemIds.length === 0) return [];
      const res = await fetch(
        `/api/purchasing/po-items?ids=${itemIds.join(",")}`
      );
      return res.json();
    },
    enabled: itemIds.length > 0,
  });

  // Load items when data arrives
  useEffect(() => {
    if (preloadedItems && preloadedItems.length > 0) {
      setItems(
        preloadedItems.map((item: any) => ({
          productVariantId: item.productVariantId,
          productName: item.productName,
          sku: item.sku,
          volume: item.volume ?? undefined, // Convert null to undefined
          strength: item.strength ?? undefined, // Convert null to undefined
          quantity: item.suggestedQuantity || 0,
          unitCost: parseFloat(item.costPrice || "0"),
          totalCost:
            (item.suggestedQuantity || 0) * parseFloat(item.costPrice || "0"),
        }))
      );
    }
  }, [preloadedItems]);

  // Generate PO number on mount
  useEffect(() => {
    const generatePONumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      return `PO-${year}${month}-${random}`;
    };
    setPoNumber(generatePONumber());
  }, []);

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].totalCost = quantity * newItems[index].unitCost;
    setItems(newItems);
  };

  const updateItemCost = (index: number, cost: number) => {
    const newItems = [...items];
    newItems[index].unitCost = cost;
    newItems[index].totalCost = newItems[index].quantity * cost;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);

  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/purchasing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create PO");
      return res.json();
    },
    onSuccess: (data) => {
      router.push(`/dashboard/purchasing/orders/${data.id}`);
    },
  });

  const handleSubmit = () => {
    createPOMutation.mutate({
      poNumber,
      supplier,
      expectedDate,
      notes,
      items,
      totalCost,
    });
  };

  const handleDownloadPDF = async () => {
    try {
      setGeneratingPDF(true);
      const response = await fetch("/api/purchasing/orders/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poNumber,
          supplier,
          expectedDate,
          notes,
          items,
          totalCost,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${poNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create Purchase Order</h1>
              <p className="text-gray-600">
                PO Number: <span className="font-mono">{poNumber}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={generatingPDF || items.length === 0}
            >
              {generatingPDF ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {generatingPDF ? "Generating..." : "Download PDF"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPOMutation.isPending || items.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              {createPOMutation.isPending ? "Saving..." : "Create PO"}
            </Button>
          </div>
        </div>

        {/* PO Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Supplier *
                </label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Enter supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Expected Delivery Date
                </label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  PO Number
                </label>
                <Input value={poNumber} disabled className="bg-gray-100" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Additional notes or instructions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Line Items</CardTitle>
              <Badge variant="secondary">{items.length} items</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items added to this purchase order</p>
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-2">Product</th>
                      <th className="pb-2">SKU</th>
                      <th className="pb-2 text-right">Quantity</th>
                      <th className="pb-2 text-right">Unit Cost</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">
                              {item.productName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.volume && `${item.volume} • `}
                              {item.strength}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-gray-600">
                          {item.sku}
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQuantity(
                                index,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-24 text-right"
                            min="0"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) =>
                              updateItemCost(
                                index,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-28 text-right"
                            min="0"
                          />
                        </td>
                        <td className="py-3 text-right font-semibold">
                          ${item.totalCost.toFixed(2)}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr>
                      <td colSpan={4} className="py-4 text-right font-semibold">
                        Total:
                      </td>
                      <td className="py-4 text-right text-xl font-bold">
                        ${totalCost.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
