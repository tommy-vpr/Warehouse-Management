"use client";

import { useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface OrderImageUploaderProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  existingImages?: Array<{
    id: string;
    url: string;
    createdAt: string;
  }>;
  onUploadSuccess?: () => void;
  compact?: boolean; // For smaller layout in packing interface
}

export default function OrderImageUploader({
  orderId,
  orderNumber,
  customerName,
  existingImages = [],
  onUploadSuccess,
  compact = false,
}: OrderImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(existingImages);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    console.log("Starting upload:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("orderId", orderId);
    formData.append("reference", orderNumber);
    formData.append("customerName", customerName);

    console.log("Uploading with:", { orderId, orderNumber, customerName });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", res.status);
      console.log(
        "Response headers:",
        Object.fromEntries(res.headers.entries())
      );

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 500));
        throw new Error(
          "Server error: Response is not JSON. Check browser console for details."
        );
      }

      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        throw new Error(
          data.error || `Upload failed with status ${res.status}`
        );
      }

      if (data.image) {
        console.log("Upload successful:", data.image);
        setImages((prev) => [...prev, data.image]);
        onUploadSuccess?.();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Delete this image?")) return;

    try {
      const res = await fetch(`/api/upload/${imageId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete image");

      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div
      className={
        compact
          ? ""
          : "bg-white dark:bg-card rounded-lg shadow dark:shadow-lg p-6 mb-6 border dark:border-border"
      }
    >
      <div
        className={`flex items-center justify-between ${
          compact ? "mb-3" : "mb-4"
        }`}
      >
        <h2
          className={`${
            compact ? "text-base" : "text-lg"
          } font-semibold flex items-center gap-2`}
        >
          <ImageIcon className={compact ? "w-4 h-4" : "w-5 h-5"} />
          Order Images
        </h2>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {images.length} image{images.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg ${
            compact ? "p-4" : "p-8"
          } text-center transition-colors
          ${
            dragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }
          ${uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}
        `}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Loader2
                className={`${
                  compact ? "w-8 h-8" : "w-10 h-10"
                } text-blue-600 animate-spin`}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uploading...
              </p>
            </>
          ) : (
            <>
              <Upload
                className={`${compact ? "w-8 h-8" : "w-10 h-10"} text-gray-400`}
              />
              <p
                className={`${
                  compact ? "text-xs" : "text-sm"
                } font-medium text-gray-700 dark:text-gray-300`}
              >
                {compact
                  ? "Upload packing photo"
                  : "Drop image here or click to browse"}
              </p>
              {!compact && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supports: JPG, PNG, GIF (max 10MB)
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className={compact ? "mt-3" : "mt-6"}>
          <div
            className={`grid ${
              compact
                ? "grid-cols-3 gap-2"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
            }`}
          >
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-lg overflow-hidden border dark:border-border bg-gray-50 dark:bg-gray-800"
              >
                <img
                  src={img.url}
                  alt="Order"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error("❌ Image failed to load:", img.url);
                    console.error("Error event:", e);
                  }}
                  onLoad={() => {
                    console.log("✅ Image loaded successfully:", img.url);
                  }}
                />

                {/* Overlay with delete button */}
                <div className="absolute inset-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-all transform scale-75 group-hover:scale-100"
                    title="Delete image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Timestamp */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(img.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
