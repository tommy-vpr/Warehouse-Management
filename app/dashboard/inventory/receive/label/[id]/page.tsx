// app/dashboard/inventory/receive/label/[id]/page.tsx
// CORRECTED: Shows who originally generated the label (from database)
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import POBarcodeLabel from "@/components/inventory/POBarcodeLabel";

export default function POBarcodeLabelPage() {
  const params = useParams();
  const router = useRouter();
  const barcodeId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["po-barcode", barcodeId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/po-barcode/${barcodeId}`);
      if (!res.ok) throw new Error("Failed to fetch barcode");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data?.barcode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load barcode label</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const { barcode } = data;
  const totalItems = barcode.expectedItems?.length || 0;
  const totalUnits = barcode.totalExpectedQty || 0;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-transparent p-6">
      {/* Navigation - hidden when printing */}
      <div className="print:hidden mb-6 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/inventory/receive/po")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to PO List
        </Button>
      </div>

      <POBarcodeLabel
        barcodeValue={barcode.barcodeValue}
        poReference={barcode.poReference}
        vendorName={barcode.vendorName}
        totalItems={totalItems}
        totalUnits={totalUnits}
        generatedBy={
          barcode.lastPrintedByUser?.name ||
          barcode.lastPrintedByUser?.email ||
          undefined
        }
      />
    </div>
  );
}

// // app/dashboard/inventory/receive/label/[id]/page.tsx
// "use client";

// import { useParams, useRouter } from "next/navigation";
// import { useQuery } from "@tanstack/react-query";
// import { Loader2, ArrowLeft } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import POBarcodeLabel from "@/components/inventory/POBarcodeLabel";

// export default function POBarcodeLabelPage() {
//   const params = useParams();
//   const router = useRouter();
//   const barcodeId = params.id as string;

//   const { data, isLoading, error } = useQuery({
//     queryKey: ["po-barcode", barcodeId],
//     queryFn: async () => {
//       const res = await fetch(`/api/inventory/po-barcode/${barcodeId}`);
//       if (!res.ok) throw new Error("Failed to fetch barcode");
//       return res.json();
//     },
//   });

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
//       </div>
//     );
//   }

//   if (error || !data?.barcode) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-red-600 mb-4">Failed to load barcode label</p>
//           <Button onClick={() => router.back()}>Go Back</Button>
//         </div>
//       </div>
//     );
//   }

//   const { barcode } = data;
//   const totalItems = barcode.expectedItems?.length || 0;
//   const totalUnits = barcode.totalExpectedQty || 0;

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">
//       {/* Navigation - hidden when printing */}
//       <div className="print:hidden mb-6 max-w-4xl mx-auto">
//         <Button
//           variant="ghost"
//           onClick={() => router.push("/dashboard/inventory/receive/po")}
//         >
//           <ArrowLeft className="w-4 h-4 mr-2" />
//           Back to PO List
//         </Button>
//       </div>

//       <POBarcodeLabel
//         barcodeValue={barcode.barcodeValue}
//         poReference={barcode.poReference}
//         vendorName={barcode.vendorName}
//         totalItems={totalItems}
//         totalUnits={totalUnits}
//       />
//     </div>
//   );
// }
