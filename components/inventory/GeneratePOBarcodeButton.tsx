// components/inventory/SmartPOBarcodeButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratePOBarcodeButtonProps {
  poId: string;
  poReference: string;
  existingBarcodeId?: string | null;
}

export default function GeneratePOBarcodeButton({
  poId,
  poReference,
  existingBarcodeId,
}: GeneratePOBarcodeButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // If barcode exists, navigate to view page
  if (existingBarcodeId) {
    return (
      <Button
        onClick={(e) => {
          e.stopPropagation();
          router.push(
            `/dashboard/inventory/receive/label/${existingBarcodeId}`
          );
        }}
        className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white"
      >
        {/* <Eye className="w-4 h-4" /> */}
        View Label
      </Button>
    );
  }

  // If no barcode, show generate button
  const handleGenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);

    try {
      const response = await fetch("/api/inventory/po-barcode/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate barcode");
      }

      toast({
        title: "✅ Label Generated",
        description: `Barcode created for PO ${poReference}`,
      });

      // Navigate to the label page
      router.push(`/dashboard/inventory/receive/label/${data.barcode.id}`);
    } catch (error: any) {
      console.error("Failed to generate barcode:", error);
      toast({
        variant: "destructive",
        title: "❌ Failed to Generate",
        description: error.message || "Could not create barcode label",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGenerate}
      disabled={isLoading}
      className="cursor-pointer"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          {/* <Printer className="w-4 h-4 mr-2" /> */}
          Generate Label
        </>
      )}
    </Button>
  );
}

// // components/inventory/GeneratePOBarcodeButton.tsx
// "use client";

// import { useState } from "react";
// import { useMutation } from "@tanstack/react-query";
// import { Button } from "@/components/ui/button";
// import { Loader2, Printer, Check } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { useRouter } from "next/navigation";

// interface GeneratePOBarcodeButtonProps {
//   poId: string;
//   poReference: string;
// }

// export default function GeneratePOBarcodeButton({
//   poId,
//   poReference,
// }: GeneratePOBarcodeButtonProps) {
//   const { toast } = useToast();
//   const router = useRouter();
//   const [generated, setGenerated] = useState(false);

//   const generateMutation = useMutation({
//     mutationFn: async () => {
//       const res = await fetch("/api/inventory/po-barcode/generate", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ poId }),
//       });

//       if (!res.ok) {
//         const error = await res.json();
//         throw new Error(error.error || "Failed to generate barcode");
//       }

//       return res.json();
//     },
//     onSuccess: (data) => {
//       setGenerated(true);
//       toast({
//         title: "✅ Label Generated",
//         description: "Opening print preview...",
//       });

//       // Open print page in new tab
//       router.push(`/dashboard/inventory/receive/label/${data.barcode.id}`);
//     },
//     onError: (error: Error) => {
//       toast({
//         variant: "destructive",
//         title: "❌ Failed to Generate",
//         description: error.message,
//       });
//     },
//   });

//   if (generated) {
//     return (
//       <Button
//         variant="outline"
//         size="sm"
//         className="text-green-600 border-green-600"
//         disabled
//       >
//         <Check className="w-4 h-4 mr-2" />
//         Label Generated
//       </Button>
//     );
//   }

//   return (
//     <Button
//       variant="outline"
//       size="sm"
//       onClick={(e) => {
//         e.stopPropagation();
//         generateMutation.mutate();
//       }}
//       disabled={generateMutation.isPending}
//     >
//       {generateMutation.isPending ? (
//         <>
//           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//           Generating...
//         </>
//       ) : (
//         <>
//           <Printer className="w-4 h-4 mr-2" />
//           Generate Label
//         </>
//       )}
//     </Button>
//   );
// }
