// components/inventory/POBarcodeLabel.tsx
// Mobile Responsive Version - Screen preview adapts, print stays fixed
"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer, AlertTriangle } from "lucide-react";

interface POBarcodeLabelProps {
  barcodeValue: string;
  poReference: string;
  vendorName: string;
  totalItems: number;
  totalUnits: number;
  generatedBy?: string;
}

export default function POBarcodeLabel({
  barcodeValue,
  poReference,
  vendorName,
  totalItems,
  totalUnits,
  generatedBy,
}: POBarcodeLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (barcodeRef.current && barcodeValue) {
      try {
        // Validate barcode value
        if (barcodeValue.length < 3) {
          setBarcodeError("Barcode value too short");
          return;
        }

        if (barcodeValue.length > 128) {
          setBarcodeError("Barcode value too long");
          return;
        }

        // Generate barcode with optimized settings
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: "CODE128",
          width: 3,
          height: 100,
          displayValue: true,
          fontSize: 16,
          margin: 15,
          background: "#FFFFFF",
          lineColor: "#000000",
          valid: (valid) => {
            if (!valid) {
              setBarcodeError("Invalid barcode format");
            } else {
              setBarcodeError(null);
            }
          },
        });
      } catch (error) {
        console.error("Barcode generation failed:", error);
        setBarcodeError("Failed to generate barcode");
      }
    }
  }, [barcodeValue]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-0">
      {/* Screen View - Controls & Warning */}
      <div className="print:hidden mb-3 sm:mb-4 space-y-3">
        {/* Mobile Warning */}
        {isMobile && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-xs sm:text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Best printed from desktop</p>
              <p className="text-xs mt-1">
                For optimal print quality, we recommend printing from a desktop
                or laptop computer.
              </p>
            </div>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Label
          </button>

          {barcodeError && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm">
              ⚠️ {barcodeError}
            </div>
          )}
        </div>
      </div>

      {/* Printable Label - Responsive screen view, fixed print */}
      <div className="bg-white border-2 sm:border-4 border-black p-4 sm:p-8 print:border-2 print:p-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 text-gray-900">
            RECEIVING LABEL
          </h1>
          <p className="text-sm sm:text-lg text-gray-600 print:text-black">
            Scan to Start Receiving
          </p>
        </div>

        {/* PO Information */}
        <div className="bg-gray-50 print:bg-white p-3 sm:p-6 mb-4 sm:mb-6 border border-gray-200 sm:border-2 print:border-black">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 print:text-black font-semibold">
                PO Number
              </p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 break-all">
                {poReference}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 print:text-black font-semibold">
                Vendor
              </p>
              <p className="text-base sm:text-xl font-semibold text-gray-900 break-words">
                {vendorName}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 print:text-black font-semibold">
                Expected Items
              </p>
              <p className="text-base sm:text-xl text-gray-900">
                {totalItems} SKUs
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 print:text-black font-semibold">
                Expected Units
              </p>
              <p className="text-base sm:text-xl text-gray-900">
                {totalUnits} units
              </p>
            </div>
          </div>
        </div>

        {/* Barcode - Responsive container, but barcode stays readable */}
        <div className="bg-white border-2 sm:border-4 border-black p-4 sm:p-8 mb-4 sm:mb-6 overflow-x-auto">
          <div className="flex justify-center items-center min-h-[100px] sm:min-h-[140px]">
            {barcodeError ? (
              <div className="text-center">
                <div className="text-red-600 font-semibold mb-2 text-sm sm:text-base">
                  ⚠️ Barcode Error
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {barcodeError}
                </div>
                <div className="mt-3 font-mono text-xs bg-gray-100 p-2 rounded break-all">
                  {barcodeValue}
                </div>
              </div>
            ) : (
              <svg ref={barcodeRef} className="max-w-full h-auto"></svg>
            )}
          </div>

          {/* Scanning Guide */}
          <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 print:text-black border-t pt-3 sm:pt-4">
            <p className="font-semibold">Optimal Scan Distance: 6-12 inches</p>
            <p className="text-xs mt-1">Hold scanner perpendicular to label</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t border-gray-300 sm:border-t-2 text-gray-900 print:border-black pt-4 sm:pt-6">
          <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3">
            Receiving Instructions:
          </h3>
          <ol className="space-y-2 text-xs sm:text-sm">
            <li className="flex gap-2">
              <span className="font-bold flex-shrink-0">1.</span>
              <span>
                Scan the barcode above on the receiving device to load PO
                details
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold flex-shrink-0">2.</span>
              <span>
                Scan each product UPC as you unpack to auto-tally the count
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold flex-shrink-0">3.</span>
              <span>Press "Done" when finished unpacking</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold flex-shrink-0">4.</span>
              <span>Review counts and submit for manager approval</span>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="mt-4 sm:mt-6 text-center text-xs text-gray-500 print:text-black">
          <p>Generated: {new Date().toLocaleString()}</p>
          {generatedBy && (
            <p className="mt-1">
              Generated by:{" "}
              <span className="font-semibold text-black">{generatedBy}</span>
            </p>
          )}
          <p className="font-mono mt-1 text-[9px] sm:text-[10px] break-all px-2">
            {barcodeValue}
          </p>
        </div>
      </div>

      {/* Enhanced Print Styles - FIXED LAYOUT FOR PRINTING */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 15mm;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          /* Force print layout to be consistent regardless of screen size */
          .max-w-4xl {
            max-width: 100% !important;
          }

          /* Optimize barcode rendering for print */
          svg {
            shape-rendering: crispEdges;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
            max-width: 100% !important;
          }

          /* Ensure true black and white (no grays) */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Force high contrast */
          .border-gray-300 {
            border-color: black !important;
          }

          .bg-gray-100,
          .bg-gray-50 {
            background: white !important;
          }

          .text-gray-600,
          .text-gray-500,
          .text-gray-900 {
            color: black !important;
          }

          /* Prevent page breaks in barcode area */
          .border-4.border-black,
          .border-2.border-black {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Reset all responsive styles for print */
          .grid-cols-1 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .text-xl,
          .text-lg,
          .text-base {
            font-size: 1.25rem !important;
          }

          h1 {
            font-size: 1.875rem !important;
          }
        }

        /* Barcode scrolling on small screens (screen only) */
        @media screen and (max-width: 640px) {
          .overflow-x-auto::-webkit-scrollbar {
            height: 4px;
          }

          .overflow-x-auto::-webkit-scrollbar-track {
            background: #f1f1f1;
          }

          .overflow-x-auto::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 2px;
          }
        }
      `}</style>
    </div>
  );
}
