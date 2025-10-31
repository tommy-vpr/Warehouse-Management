// components/InvoiceForm.tsx
"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Upload,
  X,
  FileText,
  Wand2,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface InvoiceFormProps {
  userId: string;
  orderId?: string;
  onSuccess?: (invoice: any) => void;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  sku: string;
  autoGenerate: boolean;
}

export default function InvoiceForm({
  userId,
  orderId,
  onSuccess,
}: InvoiceFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [tax, setTax] = useState("0");

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: "",
      quantity: 1,
      unitPrice: 0,
      sku: "",
      autoGenerate: true,
    },
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: "Please upload an image file (PNG, JPG, WEBP)",
        });
        return;
      }
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const generateSKU = (description: string, index: number): string => {
    const words = description
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .split(" ")
      .filter((w) => w.length > 0);

    const prefix = words.slice(0, 2).join("-").substring(0, 8);
    const timestamp = Date.now().toString().slice(-4);
    const indexStr = (index + 1).toString().padStart(2, "0");

    return `${prefix}-${timestamp}-${indexStr}`;
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        sku: "",
        autoGenerate: true,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number | boolean
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-generate SKU if description changes and autoGenerate is true
    if (field === "description" && newItems[index].autoGenerate) {
      newItems[index].sku = generateSKU(value as string, index);
    }

    setItems(newItems);
  };

  const toggleSKUMode = (index: number) => {
    const newItems = [...items];
    newItems[index].autoGenerate = !newItems[index].autoGenerate;

    // If switching to auto-generate, generate SKU now
    if (newItems[index].autoGenerate && newItems[index].description) {
      newItems[index].sku = generateSKU(newItems[index].description, index);
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + parseFloat(tax || "0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!invoiceNumber || !vendorName) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: "Invoice number and vendor name are required",
      });
      return;
    }

    if (items.some((item) => !item.description || !item.sku)) {
      toast({
        variant: "destructive",
        title: "Incomplete items",
        description: "All items must have a description and SKU",
      });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      // Add invoice data
      formData.append("userId", userId);
      if (orderId) formData.append("orderId", orderId);
      formData.append("invoiceNumber", invoiceNumber);
      formData.append("vendorName", vendorName);
      formData.append("vendorEmail", vendorEmail);
      formData.append("vendorAddress", vendorAddress);
      formData.append("vendorPhone", vendorPhone);
      formData.append("date", date);
      formData.append("dueDate", dueDate);
      formData.append("tax", tax);
      formData.append(
        "items",
        JSON.stringify(
          items.map(({ autoGenerate, ...item }) => item) // Remove autoGenerate flag
        )
      );

      // Add file if uploaded
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      }

      const response = await fetch("/api/invoice/create", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invoice");
      }

      toast({
        title: "Invoice created",
        description: `Invoice ${invoiceNumber} has been created successfully`,
      });

      // Reset form
      setInvoiceNumber("");
      setVendorName("");
      setVendorEmail("");
      setVendorAddress("");
      setVendorPhone("");
      setDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setTax("0");
      setItems([
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          sku: "",
          autoGenerate: true,
        },
      ]);
      removeFile();

      onSuccess?.(data.invoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create invoice",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Create Invoice</h2>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Original Invoice Image
            </label>
            {!uploadedFile ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload invoice image
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, WEBP up to 10MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-8 h-8 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {previewUrl && (
                  <div className="mt-3">
                    <Image
                      src={previewUrl}
                      alt="Invoice preview"
                      width={400}
                      height={300}
                      className="rounded border max-w-full h-auto"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Vendor Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Vendor/Supplier Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Example Supplies Inc"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={vendorEmail}
                  onChange={(e) => setVendorEmail(e.target.value)}
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <textarea
                value={vendorAddress}
                onChange={(e) => setVendorAddress(e.target.value)}
                placeholder="123 Supplier St&#10;City, State 12345"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Line Items
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <Card key={index} className="bg-gray-50 dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Description */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, "description", e.target.value)
                          }
                          placeholder="Product description"
                          required
                        />
                      </div>

                      {/* SKU with Auto/Manual Toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                            SKU <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => toggleSKUMode(index)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {item.autoGenerate ? (
                              <>
                                <Wand2 className="w-3 h-3" />
                                Auto-generate
                              </>
                            ) : (
                              <>Manual</>
                            )}
                          </button>
                        </div>
                        <Input
                          value={item.sku}
                          onChange={(e) =>
                            updateItem(index, "sku", e.target.value)
                          }
                          placeholder={
                            item.autoGenerate
                              ? "Auto-generated SKU"
                              : "Enter SKU manually"
                          }
                          disabled={item.autoGenerate}
                          required
                          className={
                            item.autoGenerate
                              ? "bg-gray-100 dark:bg-gray-700"
                              : ""
                          }
                        />
                      </div>

                      {/* Quantity, Price, Total */}
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Qty
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Unit Price
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Total
                          </label>
                          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm font-medium">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      {items.length > 1 && (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="max-w-sm ml-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Subtotal
                </span>
                <span className="font-medium">
                  ${calculateSubtotal().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="w-24 text-right"
                />
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
