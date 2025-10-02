// components/location/LocationBarcodeLabel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { X, Maximize2 } from "lucide-react";

interface LocationBarcodeLabelProps {
  locationName: string;
  width?: number;
  height?: number;
}

export default function LocationBarcodeLabel({
  locationName,
  width = 2,
  height = 60,
}: LocationBarcodeLabelProps) {
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate barcode for thumbnail
  useEffect(() => {
    if (thumbnailCanvasRef.current) {
      try {
        JsBarcode(thumbnailCanvasRef.current, locationName, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [locationName, width, height]);

  // Generate larger barcode for modal
  useEffect(() => {
    if (isModalOpen && modalCanvasRef.current) {
      try {
        JsBarcode(modalCanvasRef.current, locationName, {
          format: "CODE128",
          width: 4,
          height: 120,
          displayValue: true,
          fontSize: 24,
          margin: 20,
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [isModalOpen, locationName]);

  return (
    <>
      {/* Thumbnail - clickable */}
      <div
        onClick={() => setIsModalOpen(true)}
        className="relative flex flex-col items-center p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg cursor-pointer hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
      >
        <canvas ref={thumbnailCanvasRef}></canvas>
        <div className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {locationName}
        </div>

        {/* Hover indicator */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="w-4 h-4 text-blue-500" />
        </div>
      </div>

      {/* Modal with dark overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 print:hidden"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl max-w-3xl w-full p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Large barcode display */}
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Location: {locationName}
              </h2>

              <div className="bg-white p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <canvas ref={modalCanvasRef}></canvas>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
                Click outside to close or scan this barcode directly from your
                screen
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// // components/LocationBarcodeLabel.tsx
// "use client";

// import { useEffect, useRef } from "react";
// import JsBarcode from "jsbarcode";

// interface LocationBarcodeLabelProps {
//   locationName: string;
//   width?: number;
//   height?: number;
// }

// export default function LocationBarcodeLabel({
//   locationName,
//   width = 2,
//   height = 60,
// }: LocationBarcodeLabelProps) {
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     if (canvasRef.current) {
//       try {
//         JsBarcode(canvasRef.current, locationName, {
//           format: "CODE128", // Most common for alphanumeric
//           width,
//           height,
//           displayValue: true, // Shows "1-E-13-A-3-X" below barcode
//           fontSize: 14,
//           margin: 10,
//         });
//       } catch (error) {
//         console.error("Error generating barcode:", error);
//       }
//     }
//   }, [locationName, width, height]);

//   return (
//     <div className="flex flex-col items-center p-4 bg-white">
//       <canvas ref={canvasRef}></canvas>
//       <div className="mt-2 text-sm font-medium text-gray-700">
//         Location: {locationName}
//       </div>
//     </div>
//   );
// }
