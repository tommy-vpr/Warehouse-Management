// components/inventory/POBarcodeLabel.tsx
"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface POBarcodeLabelProps {
  barcodeValue: string;
  poReference: string;
  vendorName: string;
  totalItems: number;
  totalUnits: number;
}

export default function POBarcodeLabel({
  barcodeValue,
  poReference,
  vendorName,
  totalItems,
  totalUnits,
}: POBarcodeLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, barcodeValue, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
      });
    }
  }, [barcodeValue]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Screen View - with Print Button */}
      <div className="print:hidden mb-4">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          🖨️ Print Label
        </button>
      </div>

      {/* Printable Label */}
      <div className="bg-white border-4 border-black p-8 print:border-2">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">RECEIVING LABEL</h1>
          <p className="text-lg text-gray-600">Scan to Start Receiving</p>
        </div>

        {/* PO Information */}
        <div className="bg-gray-100 p-6 rounded-lg mb-6 border-2 border-gray-300">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 font-semibold">PO Number</p>
              <p className="text-2xl font-bold">{poReference}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">Vendor</p>
              <p className="text-xl font-semibold">{vendorName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 font-semibold">
                Expected Items
              </p>
              <p className="text-xl">{totalItems} SKUs</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-semibold">
                Expected Units
              </p>
              <p className="text-xl">{totalUnits} units</p>
            </div>
          </div>
        </div>

        {/* Barcode - LARGE */}
        <div className="bg-white border-4 border-black p-6 mb-6">
          <div className="flex justify-center">
            <svg ref={barcodeRef}></svg>
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t-2 border-gray-300 pt-6">
          <h3 className="font-bold text-lg mb-3">📋 Receiving Instructions:</h3>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>
                Scan the barcode above on the receiving device to load PO
                details
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>
                Scan each product UPC as you unpack to auto-tally the count
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Press "Done" when finished unpacking</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              <span>Review counts and submit for manager approval</span>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Generated: {new Date().toLocaleString()}</p>
          <p className="font-mono mt-1">{barcodeValue}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 20mm;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
}
