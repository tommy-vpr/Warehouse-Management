// utils/splitPackages.ts

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  weight: number; // lbs
  dimensions?: { length: number; width: number; height: number }; // inches
}

interface BoxType {
  code: string;
  name: string;
  maxWeight: number; // lbs
  dimensions: { length: number; width: number; height: number }; // inches
}

interface PackageResult {
  packageCode: string;
  weight: number;
  dimensions: { length: number; width: number; height: number; unit: string };
  items: { sku: string; quantity: number }[];
}

function getVolume(dim: { length: number; width: number; height: number }) {
  return dim.length * dim.width * dim.height;
}

/**
 * Splits order items into multiple packages based on box limits.
 * Chooses the smallest available box that can still fit (weight + volume).
 */
export function splitIntoPackages(
  items: OrderItem[],
  availableBoxes: BoxType[]
): PackageResult[] {
  const packages: PackageResult[] = [];

  // Sort boxes by volume (smallest first)
  const sortedBoxes = [...availableBoxes].sort(
    (a, b) => getVolume(a.dimensions) - getVolume(b.dimensions)
  );

  for (const item of items) {
    let remaining = item.quantity;

    while (remaining > 0) {
      // Try to fit item into the smallest suitable box
      const chosenBox = sortedBoxes.find(
        (box) =>
          item.weight <= box.maxWeight &&
          (!item.dimensions ||
            getVolume(item.dimensions) <= getVolume(box.dimensions))
      );

      const box = chosenBox || sortedBoxes[sortedBoxes.length - 1]; // fallback to largest

      // Check if we can add to an existing open package of the same box type
      let currentPackage = packages.find(
        (pkg) =>
          pkg.packageCode === box.code &&
          pkg.weight + item.weight <= box.maxWeight
      );

      if (!currentPackage) {
        currentPackage = {
          packageCode: box.code,
          weight: 0,
          dimensions: { ...box.dimensions, unit: "inch" },
          items: [],
        };
        packages.push(currentPackage);
      }

      currentPackage.weight += item.weight;
      currentPackage.items.push({ sku: item.sku, quantity: 1 });
      remaining--;
    }
  }

  return packages;
}
