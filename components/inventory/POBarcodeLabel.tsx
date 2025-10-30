// components/inventory/POBarcodeLabel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

interface POBarcodeLabelProps {
  barcodeValue: string;
  poReference: string;
  vendorName: string;
  totalItems: number;
  totalUnits: number;
  generatedBy?: string; // User name or email who generated the label
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

        // Generate barcode with optimized settings for TC22
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: "CODE128",
          width: 3, // Wider bars for better scanning
          height: 100, // Taller for easier targeting
          displayValue: true, // Show human-readable text
          fontSize: 16, // Larger font for readability
          margin: 15, // Larger quiet zone
          background: "#FFFFFF", // White background
          lineColor: "#000000", // Black bars (high contrast)
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
    <div className="max-w-4xl mx-auto">
      {/* Screen View - with Print Button */}
      <div className="print:hidden mb-4 flex gap-3">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Print Label
        </button>

        {barcodeError && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg">
            ⚠️ {barcodeError}
          </div>
        )}
      </div>

      {/* Printable Label */}
      <div className="bg-white border-4 border-black p-8 print:border-2">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 dark:text-gray-800">
            RECEIVING LABEL
          </h1>
          <p className="text-lg text-gray-600 print:text-black">
            Scan to Start Receiving
          </p>
        </div>

        {/* PO Information */}
        <div className="bg-gray-50 print:bg-white p-6 mb-6 border-2 border-gray-200 print:border-black">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 print:text-black font-semibold">
                PO Number
              </p>
              <p className="text-2xl font-bold dark:text-gray-800">
                {poReference}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 print:text-black font-semibold">
                Vendor
              </p>
              <p className="text-xl font-semibold dark:text-gray-800">
                {vendorName}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 print:text-black font-semibold">
                Expected Items
              </p>
              <p className="text-xl dark:text-gray-800">{totalItems} SKUs</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 print:text-black font-semibold">
                Expected Units
              </p>
              <p className="text-xl dark:text-gray-800">{totalUnits} units</p>
            </div>
          </div>
        </div>

        {/* Barcode - LARGE & OPTIMIZED */}
        <div className="bg-white border-4 border-black p-8 mb-6">
          <div className="flex justify-center items-center min-h-[140px]">
            {barcodeError ? (
              <div className="text-center">
                <div className="text-red-600 font-semibold mb-2">
                  ⚠️ Barcode Error
                </div>
                <div className="text-sm text-gray-600">{barcodeError}</div>
                <div className="mt-3 font-mono text-xs bg-gray-100 p-2 rounded">
                  {barcodeValue}
                </div>
              </div>
            ) : (
              <svg ref={barcodeRef}></svg>
            )}
          </div>

          {/* Scanning Guide */}
          <div className="text-center mt-4 text-sm text-gray-600 print:text-black border-t pt-4">
            <p className="font-semibold">Optimal Scan Distance: 6-12 inches</p>
            <p className="text-xs mt-1">Hold scanner perpendicular to label</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="border-t-2 border-gray-300 dark:text-gray-800 print:border-black pt-6">
          <h3 className="font-bold text-lg mb-3">Receiving Instructions:</h3>
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
        <div className="mt-6 text-center text-xs text-gray-500 print:text-black">
          <p>Generated: {new Date().toLocaleString()}</p>
          {generatedBy && (
            <p className="mt-1">
              Generated by:{" "}
              <span className="font-semibold text-black">{generatedBy}</span>
            </p>
          )}
          <p className="font-mono mt-1 text-[10px]">{barcodeValue}</p>
        </div>
      </div>

      {/* Enhanced Print Styles */}
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

          /* Optimize barcode rendering for print */
          svg {
            shape-rendering: crispEdges;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
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

          .bg-gray-100 {
            background: white !important;
          }

          .text-gray-600,
          .text-gray-500 {
            color: black !important;
          }

          /* Prevent page breaks in barcode area */
          .border-4.border-black {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

// // components/inventory/POBarcodeLabel.tsx
// "use client";

// import { useEffect, useRef } from "react";
// import JsBarcode from "jsbarcode";

// interface POBarcodeLabelProps {
//   barcodeValue: string;
//   poReference: string;
//   vendorName: string;
//   totalItems: number;
//   totalUnits: number;
// }

// export default function POBarcodeLabel({
//   barcodeValue,
//   poReference,
//   vendorName,
//   totalItems,
//   totalUnits,
// }: POBarcodeLabelProps) {
//   const barcodeRef = useRef<SVGSVGElement>(null);

//   useEffect(() => {
//     if (barcodeRef.current) {
//       JsBarcode(barcodeRef.current, barcodeValue, {
//         format: "CODE128",
//         width: 2,
//         height: 80,
//         displayValue: true,
//         fontSize: 14,
//         margin: 10,
//       });
//     }
//   }, [barcodeValue]);

//   const handlePrint = () => {
//     window.print();
//   };

//   return (
//     <div className="max-w-4xl mx-auto">
//       {/* Screen View - with Print Button */}
//       <div className="print:hidden mb-4">
//         <button
//           onClick={handlePrint}
//           className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
//         >
//           Print Label
//         </button>
//       </div>

//       {/* Printable Label */}
//       <div className="bg-white border-4 border-black p-8 print:border-2">
//         {/* Header */}
//         <div className="text-center mb-6">
//           <h1 className="text-3xl font-bold mb-2">RECEIVING LABEL</h1>
//           <p className="text-lg text-gray-600">Scan to Start Receiving</p>
//         </div>

//         {/* PO Information */}
//         <div className="bg-gray-100 p-6 rounded-lg mb-6 border-2 border-gray-300">
//           <div className="grid grid-cols-2 gap-4 mb-4">
//             <div>
//               <p className="text-sm text-gray-600 font-semibold">PO Number</p>
//               <p className="text-2xl font-bold">{poReference}</p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600 font-semibold">Vendor</p>
//               <p className="text-xl font-semibold">{vendorName}</p>
//             </div>
//           </div>
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <p className="text-sm text-gray-600 font-semibold">
//                 Expected Items
//               </p>
//               <p className="text-xl">{totalItems} SKUs</p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-600 font-semibold">
//                 Expected Units
//               </p>
//               <p className="text-xl">{totalUnits} units</p>
//             </div>
//           </div>
//         </div>

//         {/* Barcode - LARGE */}
//         <div className="bg-white border-4 border-black p-6 mb-6">
//           <div className="flex justify-center">
//             <svg ref={barcodeRef}></svg>
//           </div>
//         </div>

//         {/* Instructions */}
//         <div className="border-t-2 border-gray-300 pt-6">
//           <h3 className="font-bold text-lg mb-3">Receiving Instructions:</h3>
//           <ol className="space-y-2 text-sm">
//             <li className="flex gap-2">
//               <span className="font-bold">1.</span>
//               <span>
//                 Scan the barcode above on the receiving device to load PO
//                 details
//               </span>
//             </li>
//             <li className="flex gap-2">
//               <span className="font-bold">2.</span>
//               <span>
//                 Scan each product UPC as you unpack to auto-tally the count
//               </span>
//             </li>
//             <li className="flex gap-2">
//               <span className="font-bold">3.</span>
//               <span>Press "Done" when finished unpacking</span>
//             </li>
//             <li className="flex gap-2">
//               <span className="font-bold">4.</span>
//               <span>Review counts and submit for manager approval</span>
//             </li>
//           </ol>
//         </div>

//         {/* Footer */}
//         <div className="mt-6 text-center text-xs text-gray-500">
//           <p>Generated: {new Date().toLocaleString()}</p>
//           <p className="font-mono mt-1">{barcodeValue}</p>
//         </div>
//       </div>

//       {/* Print Styles */}
//       <style jsx global>{`
//         @media print {
//           body {
//             margin: 0;
//             padding: 15mm;
//           }
//           @page {
//             size: A4;
//             margin: 10mm;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }
