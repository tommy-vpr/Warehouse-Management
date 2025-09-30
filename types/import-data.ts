export type CSVRow = Record<string, string>;

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Weight {
  value: number;
  unit: "oz" | "lbs";
}

export interface ParsedProduct {
  baseProduct: string;
  flavor: string;
  productLine: string;
  brand: string;
  fullName: string;
  sku: string;
  upc: string;
  volume: string;
  strength: string;
  singleWeight: Weight | null;
  singleDimensions: Dimensions | null;
  masterCase: {
    qty: string;
    weight: Weight | null;
    dimensions: Dimensions | null;
  };
  category: string;
  hasIce: boolean;
  hasSalt: boolean;
  isNicotineFree: boolean;
  reorderPoint: number;
}

export type ProductGroup = Record<string, ParsedProduct[]>;

export interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
}
