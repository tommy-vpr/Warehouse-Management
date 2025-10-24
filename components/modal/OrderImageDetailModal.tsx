// components/orders/OrderImageDetailModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X, Calendar, Trash } from "lucide-react";

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
      const res = await fetch(`/api/upload/${image.id}`, {
        method: "DELETE",
      });

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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Image - {orderNumber}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Image Display */}
        <div className="relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
          <img
            src={image.url}
            alt="Order"
            className="w-full h-auto max-h-[70vh] object-contain"
          />
        </div>

        {/* Image Metadata */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 dark:text-gray-400">Uploaded:</span>
            <span className="font-medium">
              {new Date(image.createdAt).toLocaleString()}
            </span>
          </div>

          {/* {image.reference && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Reference:
              </span>
              <span className="font-medium">{image.reference}</span>
            </div>
          )} */}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2 border-t pt-4">
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="cursor-pointer"
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete Image
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(image.url, "_blank")}
              className="cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="cursor-pointer"
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
