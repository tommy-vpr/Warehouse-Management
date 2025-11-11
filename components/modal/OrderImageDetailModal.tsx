"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Trash } from "lucide-react";

interface OrderImageDetailModalProps {
  image: {
    id: string;
    url: string;
    createdAt: string;
    reference?: string;
  } | null;
  orderNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (imageId: string) => void;
}

export default function OrderImageDetailModal({
  image,
  orderNumber,
  open,
  onOpenChange,
  onDelete,
}: OrderImageDetailModalProps) {
  if (!image) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-${orderNumber}-${image.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    try {
      const res = await fetch(`/api/upload/${image.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete image");
      onDelete?.(image.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete image");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[95%] max-w-3xl sm:max-w-2xl md:max-w-3xl
          left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          max-h-[90vh] flex flex-col p-0 overflow-hidden
        "
      >
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b bg-card sticky top-0 z-10">
          <DialogTitle className="text-base sm:text-lg font-semibold truncate">
            Order Image — {orderNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Image */}
        <div
          className="
            flex-1 
            flex items-center justify-center 
            overflow-hidden
          "
        >
          <img
            src={image.url}
            alt="Order"
            className="max-h-[65vh] w-auto object-contain rounded-md"
          />
        </div>

        {/* Metadata */}
        <div className="px-5 py-3 border-t bg-muted/40 text-sm space-y-1">
          <p className="text-muted-foreground">
            Uploaded:{" "}
            <span className="text-foreground font-medium">
              {new Date(image.createdAt).toLocaleString()}
            </span>
          </p>
          {image.reference && (
            <p className="text-muted-foreground">
              Reference:{" "}
              <span className="text-foreground font-medium break-all">
                {image.reference}
              </span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div
          className="
            px-5 py-4 border-t bg-background
            flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center
          "
        >
          {/* Delete on left (desktop), bottom (mobile) */}
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="w-full sm:w-auto"
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete Image
          </Button>

          {/* Secondary actions */}
          <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => window.open(image.url, "_blank")}
              className="w-full sm:w-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// // components/orders/OrderImageDetailModal.tsx
// "use client";

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Download, ExternalLink, Trash } from "lucide-react";

// interface OrderImageDetailModalProps {
//   image: {
//     id: string;
//     url: string;
//     createdAt: string;
//     reference?: string;
//   } | null;
//   orderNumber: string;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   onDelete?: (imageId: string) => void;
// }

// export default function OrderImageDetailModal({
//   image,
//   orderNumber,
//   open,
//   onOpenChange,
//   onDelete,
// }: OrderImageDetailModalProps) {
//   if (!image) return null;

//   const handleDownload = async () => {
//     try {
//       const response = await fetch(image.url);
//       const blob = await response.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `order-${orderNumber}-${image.id}.jpg`;
//       document.body.appendChild(a);
//       a.click();
//       window.URL.revokeObjectURL(url);
//       document.body.removeChild(a);
//     } catch (error) {
//       console.error("Download failed:", error);
//     }
//   };

//   const handleDelete = async () => {
//     if (!confirm("Are you sure you want to delete this image?")) return;

//     try {
//       const res = await fetch(`/api/upload/${image.id}`, {
//         method: "DELETE",
//       });

//       if (!res.ok) throw new Error("Failed to delete image");

//       onDelete?.(image.id);
//       onOpenChange(false);
//     } catch (error) {
//       console.error("Delete failed:", error);
//       alert("Failed to delete image");
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="max-w-2xl w-[calc(100%-2rem)] sm:w-full left-[50%] translate-x-[-50%] top-[50%] translate-y-[-50%] max-h-[90vh] overflow-y-auto">
//         {/* Header */}
//         <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b">
//           <DialogTitle className="text-base sm:text-lg font-semibold truncate">
//             Order Image - {orderNumber}
//           </DialogTitle>
//         </DialogHeader>

//         {/* Image Display */}
//         <div className="relative bg-gray-100 dark:bg-gray-900">
//           <img
//             src={image.url}
//             alt="Order"
//             className="w-full h-auto max-h-[50vh] sm:max-h-[60vh] object-contain"
//           />
//         </div>

//         {/* Image Metadata */}
//         <div className="px-4 py-3 sm:px-6 sm:py-4 border-t bg-gray-50 dark:bg-gray-900">
//           <div className="flex items-center gap-2 text-xs sm:text-sm">
//             <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
//               Uploaded:
//             </span>
//             <span className="font-medium text-gray-900 dark:text-gray-100">
//               {new Date(image.createdAt).toLocaleString()}
//             </span>
//           </div>

//           {image.reference && (
//             <div className="flex items-center gap-2 text-xs sm:text-sm mt-2">
//               <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
//                 Reference:
//               </span>
//               <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
//                 {image.reference}
//               </span>
//             </div>
//           )}
//         </div>

//         {/* Actions */}
//         <div className="px-4 py-3 sm:px-6 sm:py-4 border-t bg-white dark:bg-gray-950">
//           {/* Mobile: Stacked Buttons */}
//           <div className="flex flex-col sm:hidden gap-2">
//             <Button
//               variant="outline"
//               onClick={() => window.open(image.url, "_blank")}
//               className="w-full"
//             >
//               <ExternalLink className="w-4 h-4 mr-2" />
//               Open in New Tab
//             </Button>
//             <Button
//               variant="outline"
//               onClick={handleDownload}
//               className="w-full"
//             >
//               <Download className="w-4 h-4 mr-2" />
//               Download
//             </Button>
//             <Button
//               variant="destructive"
//               onClick={handleDelete}
//               className="w-full"
//             >
//               <Trash className="w-4 h-4 mr-2" />
//               Delete Image
//             </Button>
//           </div>

//           {/* Desktop: Side by Side */}
//           <div className="hidden sm:flex justify-between gap-2">
//             <Button variant="destructive" onClick={handleDelete}>
//               <Trash className="w-4 h-4 mr-2" />
//               Delete Image
//             </Button>

//             <div className="flex gap-2">
//               <Button
//                 variant="outline"
//                 onClick={() => window.open(image.url, "_blank")}
//               >
//                 <ExternalLink className="w-4 h-4 mr-2" />
//                 Open in New Tab
//               </Button>
//               <Button variant="outline" onClick={handleDownload}>
//                 <Download className="w-4 h-4 mr-2" />
//                 Download
//               </Button>
//             </div>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
