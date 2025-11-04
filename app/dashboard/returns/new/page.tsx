// dashboard/returns/new/page.tsx
// Customer Return Portal - Order Lookup & RMA Creation

"use client";

import { useState } from "react";
import {
  OrderLookupResponse,
  CreateReturnRequest,
  ReturnReason,
  RefundMethod,
} from "@/types/returns";

export default function NewReturnPage() {
  const [step, setStep] = useState<
    "lookup" | "select-items" | "confirm" | "complete"
  >("lookup");

  // Step 1: Order Lookup
  const [orderNumber, setOrderNumber] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<OrderLookupResponse | null>(
    null
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Step 2: Select Items
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    {}
  );
  const [returnReason, setReturnReason] = useState<ReturnReason>(
    ReturnReason.NO_LONGER_NEEDED
  );
  const [reasonDetails, setReasonDetails] = useState("");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>(
    RefundMethod.ORIGINAL_PAYMENT
  );

  // Step 3: Result
  const [rmaNumber, setRmaNumber] = useState<string | null>(null);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Handle order lookup
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupLoading(true);
    setLookupError(null);

    try {
      const response = await fetch("/api/returns/lookup-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, customerEmail }),
      });

      const data: OrderLookupResponse = await response.json();

      if (!data.success) {
        setLookupError(
          data.error || "Order not found or ineligible for return"
        );
        return;
      }

      setLookupResult(data);
      setStep("select-items");
    } catch (error) {
      setLookupError("Failed to lookup order. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle item quantity change
  const handleQuantityChange = (productVariantId: string, quantity: number) => {
    if (quantity === 0) {
      const newSelected = { ...selectedItems };
      delete newSelected[productVariantId];
      setSelectedItems(newSelected);
    } else {
      setSelectedItems({
        ...selectedItems,
        [productVariantId]: quantity,
      });
    }
  };

  // Calculate total refund estimate
  const calculateEstimatedRefund = () => {
    if (!lookupResult?.order) return 0;

    return lookupResult.order.items.reduce((total, item) => {
      const qty = selectedItems[item.productVariantId] || 0;
      return total + item.unitPrice * qty;
    }, 0);
  };

  // Handle return creation
  const handleCreateReturn = async () => {
    if (!lookupResult?.order) return;

    const itemsToReturn = Object.entries(selectedItems).map(
      ([productVariantId, quantity]) => ({
        productVariantId,
        quantityRequested: quantity,
      })
    );

    if (itemsToReturn.length === 0) {
      setCreateError("Please select at least one item to return");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const request: CreateReturnRequest = {
        orderId: lookupResult.order.id,
        customerEmail: lookupResult.order.customerEmail,
        reason: returnReason,
        reasonDetails: reasonDetails || undefined,
        refundMethod,
        items: itemsToReturn,
      };

      const response = await fetch("/api/returns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!data.success) {
        setCreateError(data.error || "Failed to create return");
        return;
      }

      setRmaNumber(data.returnOrder.rmaNumber);
      setApprovalRequired(data.returnOrder.approvalRequired);
      setStep("complete");
    } catch (error) {
      setCreateError("Failed to create return. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Start a Return</h1>
          <p className="mt-2 text-sm text-gray-600">
            Returns accepted within 30 days of delivery
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div
              className={`flex items-center ${
                step === "lookup" ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === "lookup"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                1
              </div>
              <span className="ml-2 text-sm font-medium">Find Order</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div
              className={`flex items-center ${
                step === "select-items" || step === "confirm"
                  ? "text-blue-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === "select-items" || step === "confirm"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                2
              </div>
              <span className="ml-2 text-sm font-medium">Select Items</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div
              className={`flex items-center ${
                step === "complete" ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === "complete"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                3
              </div>
              <span className="ml-2 text-sm font-medium">Confirm</span>
            </div>
          </div>
        </div>

        {/* Step 1: Order Lookup */}
        {step === "lookup" && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Find Your Order
            </h2>
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label
                  htmlFor="orderNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  Order Number
                </label>

                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-gray-500 select-none">
                    #
                  </span>
                  <input
                    type="text"
                    id="orderNumber"
                    value={orderNumber.replace(/^#/, "")} // display without #
                    onChange={(e) => {
                      const input = e.target.value.replace(/^#*/, ""); // strip extra #
                      setOrderNumber("#" + input); // always keep one #
                    }}
                    placeholder="1234"
                    required
                    className="pl-6 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="customerEmail"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1 p-2  block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the email used when placing the order
                </p>
              </div>

              {lookupError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="text-sm text-red-700">{lookupError}</div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {lookupLoading ? "Looking up..." : "Find Order"}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Select Items */}
        {step === "select-items" && lookupResult?.order && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Select Items to Return
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Order {lookupResult.order.orderNumber} · Shipped on{" "}
                {lookupResult.order.shippedAt
                  ? new Date(lookupResult.order.shippedAt).toLocaleDateString()
                  : "N/A"}
              </p>
              {lookupResult.eligibility.daysRemaining !== undefined && (
                <p className="mt-1 text-sm text-amber-600">
                  {lookupResult.eligibility.daysRemaining} days remaining to
                  return
                </p>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-4 mb-6">
              {lookupResult.order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start space-x-4 p-4 border rounded-lg"
                >
                  {/* Product Image Placeholder */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-400">No image</span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      SKU: {item.sku}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      ${item.unitPrice.toFixed(2)} each
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Ordered: {item.quantity} · Available to return:{" "}
                      {item.quantityAvailable}
                    </p>
                  </div>

                  {/* Quantity Selector */}
                  <div className="flex-shrink-0">
                    <label className="block text-xs text-gray-700 mb-1">
                      Return Qty
                    </label>
                    <select
                      value={selectedItems[item.productVariantId] || 0}
                      onChange={(e) =>
                        handleQuantityChange(
                          item.productVariantId,
                          parseInt(e.target.value)
                        )
                      }
                      className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    >
                      {Array.from(
                        { length: item.quantityAvailable + 1 },
                        (_, i) => i
                      ).map((qty) => (
                        <option key={qty} value={qty}>
                          {qty}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Return Reason */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Return
                </label>
                <select
                  value={returnReason}
                  onChange={(e) =>
                    setReturnReason(e.target.value as ReturnReason)
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value={ReturnReason.NO_LONGER_NEEDED}>
                    No longer needed
                  </option>
                  <option value={ReturnReason.DEFECTIVE}>
                    Defective or damaged
                  </option>
                  <option value={ReturnReason.WRONG_ITEM}>
                    Wrong item sent
                  </option>
                  <option value={ReturnReason.NOT_AS_DESCRIBED}>
                    Not as described
                  </option>
                  <option value={ReturnReason.ORDERED_BY_MISTAKE}>
                    Ordered by mistake
                  </option>
                  <option value={ReturnReason.BETTER_PRICE}>
                    Found better price
                  </option>
                  <option value={ReturnReason.DAMAGED_SHIPPING}>
                    Damaged during shipping
                  </option>
                  <option value={ReturnReason.EXPIRED}>Product expired</option>
                  <option value={ReturnReason.OTHER}>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  rows={3}
                  placeholder="Please provide any additional details about your return..."
                  className="p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Method
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) =>
                    setRefundMethod(e.target.value as RefundMethod)
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value={RefundMethod.ORIGINAL_PAYMENT}>
                    Original payment method
                  </option>
                  <option value={RefundMethod.STORE_CREDIT}>
                    Store credit
                  </option>
                  <option value={RefundMethod.REPLACEMENT}>
                    Replacement product
                  </option>
                </select>
              </div>
            </div>

            {/* Estimated Refund */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Refund:</span>
                <span className="font-medium text-gray-900">
                  ${calculateEstimatedRefund().toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Final refund amount will be determined after inspection.
                {returnReason !== ReturnReason.DEFECTIVE &&
                  returnReason !== ReturnReason.WRONG_ITEM &&
                  " A 15% restocking fee may apply."}
              </p>
            </div>

            {createError && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <div className="text-sm text-red-700">{createError}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => setStep("lookup")}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCreateReturn}
                disabled={
                  createLoading || Object.keys(selectedItems).length === 0
                }
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {createLoading ? "Creating..." : "Create Return"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === "complete" && rmaNumber && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Return Created Successfully!
              </h2>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Your RMA Number:</p>
                <p className="text-3xl font-mono font-bold text-blue-600">
                  {rmaNumber}
                </p>
              </div>

              {approvalRequired ? (
                <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Approval Required:</strong> Your return requires
                    manager approval. You will receive an email within 1-2
                    business days with further instructions.
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    ⚠️ IMPORTANT: Next Steps
                  </h3>
                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                    <ol className="text-left space-y-3 text-sm text-gray-800">
                      <li className="flex items-start">
                        <span className="font-bold mr-2 text-lg">1.</span>
                        <div>
                          <strong>Print Your Packing Slip</strong>
                          <p className="text-gray-600 mt-1">
                            Click the button below to open your packing slip
                            with barcode.
                            <strong>
                              {" "}
                              The warehouse MUST scan this barcode to process
                              your return.
                            </strong>
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="font-bold mr-2 text-lg">2.</span>
                        <div>
                          <strong>Place Packing Slip INSIDE the Box</strong>
                          <p className="text-gray-600 mt-1">
                            Put the printed packing slip inside the package with
                            your items.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="font-bold mr-2 text-lg">3.</span>
                        <div>
                          <strong>Pack Items Securely</strong>
                          <p className="text-gray-600 mt-1">
                            Use original packaging if possible. Seal the box
                            securely.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="font-bold mr-2 text-lg">4.</span>
                        <div>
                          <strong>Attach Shipping Label</strong>
                          <p className="text-gray-600 mt-1">
                            Check your email for the return shipping label and
                            attach it to the OUTSIDE of the box.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="font-bold mr-2 text-lg">5.</span>
                        <div>
                          <strong>Ship It!</strong>
                          <p className="text-gray-600 mt-1">
                            Drop off at your nearest carrier location. We'll
                            email you when we receive it.
                          </p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  {/* PRIMARY ACTION: Print Packing Slip */}
                  <a
                    href={`/dashboard/returns/packing-slip/${rmaNumber}`}
                    target="_blank"
                    className="block w-full py-4 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg mb-3"
                  >
                    Print Packing Slip with Barcode
                  </a>

                  <p className="text-xs text-red-600 font-medium mb-4">
                    ⚠️ Without the packing slip barcode inside your package, we
                    cannot process your return!
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col space-y-2">
                <button
                  onClick={() =>
                    window.open(
                      `/dashboard/returns/packing-slip/${rmaNumber}`,
                      "_blank"
                    )
                  }
                  className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  View Packing Slip Again
                </button>
                <button
                  onClick={() => {
                    setStep("lookup");
                    setOrderNumber("");
                    setCustomerEmail("");
                    setSelectedItems({});
                    setRmaNumber(null);
                  }}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700"
                >
                  Start Another Return
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
