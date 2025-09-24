// components/CarrierBadge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CarrierBadgeProps {
  carrierCode: string;
  className?: string;
}

export function CarrierBadge({ carrierCode, className }: CarrierBadgeProps) {
  const getCarrierName = (code: string) => {
    const carriers: { [key: string]: string } = {
      ups: "UPS",
      fedex: "FedEx",
      stamps_com: "USPS",
      usps: "USPS",
      dhl: "DHL",
    };
    return carriers[code] || code.toUpperCase();
  };

  const getCarrierStyles = (code: string) => {
    switch (code.toLowerCase()) {
      case "ups":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700";
      case "fedex":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700";
      case "stamps_com":
      case "usps":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700";
      case "dhl":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700";
    }
  };

  return (
    <Badge
      className={cn(
        "font-medium border",
        getCarrierStyles(carrierCode),
        className
      )}
      variant="outline"
    >
      {getCarrierName(carrierCode)}
    </Badge>
  );
}
