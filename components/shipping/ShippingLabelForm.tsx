"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Plus,
  Minus,
  Package,
  Truck,
  AlertCircle,
  Loader2,
  X,
  Check,
} from "lucide-react";

interface PackageConfig {
  id: string;
  packageCode: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  items: ShipmentItem[];
}

interface Shipment {
  id: string;
  name: string;
  items: ShipmentItem[];
  carrierId: string;
  serviceCode: string;
  packages: PackageConfig[];
  notes: string;
}

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  weightOz?: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  totalAmount: string;
  items: OrderItem[];
  shippingAddress: {
    address1: string;
    city: string;
    province: string;
    province_code: string;
    zip: string;
    name?: string;
    country?: string;
    country_code?: string;
  };
}

interface Carrier {
  carrier_id: string;
  carrier_code: string;
  friendly_name: string;
  services: Array<{
    service_code: string;
    name: string;
  }>;
  packages: Array<{
    package_code: string;
    name: string;
  }>;
}

interface ShipmentItem {
  itemId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  weightOz?: number;
}

interface ShippingLabelFormProps {
  order: Order;
  onSuccess?: (results: any[]) => void;
  onCancel?: () => void;
  embedded?: boolean;
  initialWeight?: number;
  initialDimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export default function ShippingLabelForm({
  order,
  onSuccess,
  onCancel,
  embedded = false,
  initialWeight,
  initialDimensions,
}: ShippingLabelFormProps) {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedItemForSplit, setSelectedItemForSplit] = useState<{
    itemId: string;
    availableQty: number;
  } | null>(null);
  const [splitQuantity, setSplitQuantity] = useState(1);
  const [splitMode, setSplitMode] = useState(false);
  const [packageMode, setPackageMode] = useState(false);

  const [numberOfPackages, setNumberOfPackages] = useState("");

  const dimensionsAppliedRef = useRef(false);

  const generateId = useCallback(
    () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    []
  );

  const getRemainingQuantity = useCallback(
    (itemId: string): number => {
      const originalItem = order?.items.find((item) => item.id === itemId);
      if (!originalItem) return 0;

      if (packageMode && shipments.length > 0) {
        const shipment = shipments[0];
        const totalAllocated = shipment.packages.reduce((total, pkg) => {
          return (
            total +
            pkg.items.reduce((pkgTotal, item) => {
              return item.itemId === itemId
                ? pkgTotal + item.quantity
                : pkgTotal;
            }, 0)
          );
        }, 0);
        return originalItem.quantity - totalAllocated;
      }

      const totalAllocated = shipments.reduce((total, shipment) => {
        return (
          total +
          shipment.items.reduce((shipmentTotal, item) => {
            return item.itemId === itemId
              ? shipmentTotal + item.quantity
              : shipmentTotal;
          }, 0)
        );
      }, 0);

      return originalItem.quantity - totalAllocated;
    },
    [order, shipments, packageMode]
  );

  const getAllocationSummary = useMemo(() => {
    if (!order) return [];

    return order.items.map((item) => ({
      ...item,
      remaining: getRemainingQuantity(item.id),
      allocated: item.quantity - getRemainingQuantity(item.id),
    }));
  }, [order, getRemainingQuantity]);

  useEffect(() => {
    loadCarriers();
    initializeShipment();
  }, []);

  useEffect(() => {
    if (
      (initialDimensions || initialWeight) &&
      shipments.length > 0 &&
      !dimensionsAppliedRef.current
    ) {
      setShipments((prevShipments) => {
        const updatedShipments = [...prevShipments];
        const firstShipment = updatedShipments[0];

        if (firstShipment && firstShipment.packages.length > 0) {
          updatedShipments[0] = {
            ...firstShipment,
            packages: [
              {
                ...firstShipment.packages[0],
                weight: initialWeight
                  ? initialWeight.toString()
                  : firstShipment.packages[0].weight,
                dimensions: {
                  length:
                    initialDimensions?.length?.toString() ||
                    firstShipment.packages[0].dimensions.length,
                  width:
                    initialDimensions?.width?.toString() ||
                    firstShipment.packages[0].dimensions.width,
                  height:
                    initialDimensions?.height?.toString() ||
                    firstShipment.packages[0].dimensions.height,
                },
              },
              ...firstShipment.packages.slice(1),
            ],
          };
        }

        return updatedShipments;
      });

      dimensionsAppliedRef.current = true;
    }
  }, [initialWeight, initialDimensions, shipments.length]);

  const loadCarriers = async () => {
    try {
      const response = await fetch("/api/carriers");
      if (!response.ok) throw new Error("Failed to load carriers");
      const carriersData = await response.json();
      setCarriers(carriersData);
    } catch (err) {
      console.error("Failed to load carriers:", err);
      setError("Failed to load carriers");
    } finally {
      setCarriersLoading(false);
    }
  };

  const initializeShipment = () => {
    const initialShipment: Shipment = {
      id: generateId(),
      name: "Shipment 1",
      items: order.items.map((item) => ({
        itemId: item.id,
        productName: item.productName,
        sku: item.sku,
        unitPrice: parseFloat(item.unitPrice),
        quantity: item.quantity,
        weightOz: item.weightOz,
      })),
      carrierId: "",
      serviceCode: "",
      packages: [
        {
          id: generateId(),
          packageCode: "",
          weight: initialWeight ? initialWeight.toString() : "",
          dimensions: {
            length: initialDimensions?.length?.toString() || "12",
            width: initialDimensions?.width?.toString() || "10",
            height: initialDimensions?.height?.toString() || "6",
          },
          items: [],
        },
      ],
      notes: "",
    };

    setShipments([initialShipment]);
    dimensionsAppliedRef.current = false;
  };

  const isStampsCarrier = (carrierId: string): boolean => {
    const carrier = carriers.find((c) => c.carrier_id === carrierId);
    return carrier?.carrier_code === "stamps_com" || false;
  };

  const isUPSCarrier = (carrierId: string): boolean => {
    const carrier = carriers.find((c) => c.carrier_id === carrierId);
    return carrier?.carrier_code === "ups" || false;
  };

  const enablePackageMode = () => {
    setPackageMode(true);
    if (shipments.length === 1) {
      const firstShipment = shipments[0];
      setShipments([
        {
          ...firstShipment,
          packages: [
            firstShipment.packages[0],
            {
              id: generateId(),
              packageCode: firstShipment.packages[0].packageCode,
              weight: "",
              dimensions: { length: "12", width: "10", height: "6" },
              items: [],
            },
          ],
        },
      ]);
    }
  };

  const enableSplitMode = () => {
    setSplitMode(true);
    if (shipments.length === 1) {
      setShipments([
        ...shipments,
        {
          id: generateId(),
          name: "Shipment 2",
          items: [],
          carrierId: shipments[0].carrierId,
          serviceCode: "",
          packages: [
            {
              id: generateId(),
              packageCode: "",
              weight: "",
              dimensions: { length: "12", width: "10", height: "6" },
              items: [],
            },
          ],
          notes: "",
        },
      ]);
    }
  };

  const createNewShipment = () => {
    const firstShipment = shipments[0];
    const inheritedCarrierId = splitMode ? firstShipment?.carrierId || "" : "";

    setShipments([
      ...shipments,
      {
        id: generateId(),
        name: `Shipment ${shipments.length + 1}`,
        items: [],
        carrierId: inheritedCarrierId,
        serviceCode: "",
        packages: [
          {
            id: generateId(),
            packageCode: "",
            weight: "",
            dimensions: { length: "12", width: "10", height: "6" },
            items: [],
          },
        ],
        notes: "",
      },
    ]);
  };

  const addPackageToShipment = (shipmentId: string) => {
    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;

        const firstPackage = shipment.packages[0];

        const totalWeightOz = shipment.items.reduce((sum, item) => {
          return sum + (item.weightOz || 0) * item.quantity;
        }, 0);
        const totalWeightLbs = totalWeightOz / 16;
        const newPackageCount = shipment.packages.length + 1;
        const weightPerPackage = (totalWeightLbs / newPackageCount).toFixed(2);

        return {
          ...shipment,
          packages: [
            ...shipment.packages.map((pkg) => ({
              ...pkg,
              weight: weightPerPackage,
            })),
            {
              id: generateId(),
              packageCode: firstPackage?.packageCode || "",
              weight: weightPerPackage,
              dimensions: { length: "12", width: "10", height: "6" },
              items: [],
            },
          ],
        };
      })
    );
  };

  const addMultiplePackages = (shipmentId: string, count: number) => {
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) return;

    const firstPackage = shipment.packages[0];
    const newPackages: PackageConfig[] = [];

    for (let i = 0; i < count; i++) {
      newPackages.push({
        id: generateId(),
        packageCode: firstPackage?.packageCode || "",
        weight: "",
        dimensions: { length: "12", width: "10", height: "6" },
        items: [],
      });
    }

    setShipments(
      shipments.map((s) =>
        s.id === shipmentId
          ? {
              ...s,
              packages: [...s.packages, ...newPackages],
            }
          : s
      )
    );

    setNumberOfPackages("");
  };

  const removePackageFromShipment = (shipmentId: string, packageId: string) => {
    setShipments(
      shipments.map((shipment) =>
        shipment.id === shipmentId
          ? {
              ...shipment,
              packages: shipment.packages.filter((p) => p.id !== packageId),
            }
          : shipment
      )
    );
  };

  const updatePackageConfig = (
    shipmentId: string,
    packageId: string,
    field: string,
    value: string
  ) => {
    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        return {
          ...shipment,
          packages: shipment.packages.map((pkg) =>
            pkg.id === packageId
              ? field.includes(".")
                ? {
                    ...pkg,
                    dimensions: {
                      ...pkg.dimensions,
                      [field.split(".")[1]]: value,
                    },
                  }
                : { ...pkg, [field]: value }
              : pkg
          ),
        };
      })
    );
  };

  const removeShipment = (shipmentId: string) => {
    if (shipments.length <= 1) return;

    const updatedShipments = shipments.filter((s) => s.id !== shipmentId);

    const renumberedShipments = updatedShipments.map((shipment, index) => ({
      ...shipment,
      name: `Shipment ${index + 1}`,
    }));

    setShipments(renumberedShipments);
  };

  const addItemToPackage = (
    shipmentId: string,
    packageId: string,
    itemId: string,
    quantity: number
  ) => {
    const originalItem = order?.items.find((item) => item.id === itemId);
    if (!originalItem) return;

    const remainingQty = getRemainingQuantity(itemId);
    const validQuantity = Math.min(quantity, remainingQty);

    if (validQuantity <= 0) return;

    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;

        return {
          ...shipment,
          packages: shipment.packages.map((pkg) => {
            if (pkg.id !== packageId) return pkg;

            const existingItemIndex = pkg.items.findIndex(
              (item) => item.itemId === itemId
            );

            if (existingItemIndex >= 0) {
              const updatedItems = [...pkg.items];
              updatedItems[existingItemIndex] = {
                ...updatedItems[existingItemIndex],
                quantity:
                  updatedItems[existingItemIndex].quantity + validQuantity,
              };
              return { ...pkg, items: updatedItems };
            } else {
              const newItem: ShipmentItem = {
                itemId: originalItem.id,
                productName: originalItem.productName,
                sku: originalItem.sku,
                unitPrice: parseFloat(originalItem.unitPrice),
                quantity: validQuantity,
                weightOz: originalItem.weightOz,
              };
              return { ...pkg, items: [...pkg.items, newItem] };
            }
          }),
        };
      })
    );

    setSelectedItemForSplit(null);
    setSplitQuantity(1);
  };

  const addItemToShipment = (
    shipmentId: string,
    itemId: string,
    quantity: number
  ) => {
    const originalItem = order?.items.find((item) => item.id === itemId);
    if (!originalItem) return;

    const remainingQty = getRemainingQuantity(itemId);
    const validQuantity = Math.min(quantity, remainingQty);

    if (validQuantity <= 0) return;

    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;

        const existingItemIndex = shipment.items.findIndex(
          (item) => item.itemId === itemId
        );

        if (existingItemIndex >= 0) {
          const updatedItems = [...shipment.items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + validQuantity,
          };
          return { ...shipment, items: updatedItems };
        } else {
          const newItem: ShipmentItem = {
            itemId: originalItem.id,
            productName: originalItem.productName,
            sku: originalItem.sku,
            unitPrice: parseFloat(originalItem.unitPrice),
            quantity: validQuantity,
            weightOz: originalItem.weightOz,
          };
          return { ...shipment, items: [...shipment.items, newItem] };
        }
      })
    );

    setSelectedItemForSplit(null);
    setSplitQuantity(1);
  };

  const removeItemFromPackage = (
    shipmentId: string,
    packageId: string,
    itemId: string
  ) => {
    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        return {
          ...shipment,
          packages: shipment.packages.map((pkg) =>
            pkg.id === packageId
              ? {
                  ...pkg,
                  items: pkg.items.filter((item) => item.itemId !== itemId),
                }
              : pkg
          ),
        };
      })
    );
  };

  const removeItemFromShipment = (shipmentId: string, itemId: string) => {
    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        return {
          ...shipment,
          items: shipment.items.filter((item) => item.itemId !== itemId),
        };
      })
    );
  };

  const updateItemQuantityInPackage = (
    shipmentId: string,
    packageId: string,
    itemId: string,
    newQuantity: number
  ) => {
    const remainingQty = getRemainingQuantity(itemId);
    const currentShipment = shipments.find((s) => s.id === shipmentId);
    const currentPackage = currentShipment?.packages.find(
      (p) => p.id === packageId
    );
    const currentItem = currentPackage?.items.find((i) => i.itemId === itemId);
    const maxAllowed = remainingQty + (currentItem?.quantity || 0);

    const validQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

    if (validQuantity === 0) {
      removeItemFromPackage(shipmentId, packageId, itemId);
      return;
    }

    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        return {
          ...shipment,
          packages: shipment.packages.map((pkg) =>
            pkg.id === packageId
              ? {
                  ...pkg,
                  items: pkg.items.map((item) =>
                    item.itemId === itemId
                      ? { ...item, quantity: validQuantity }
                      : item
                  ),
                }
              : pkg
          ),
        };
      })
    );
  };

  const updateItemQuantityInShipment = (
    shipmentId: string,
    itemId: string,
    newQuantity: number
  ) => {
    const remainingQty = getRemainingQuantity(itemId);
    const currentShipment = shipments.find((s) => s.id === shipmentId);
    const currentItem = currentShipment?.items.find((i) => i.itemId === itemId);
    const maxAllowed = remainingQty + (currentItem?.quantity || 0);

    const validQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

    if (validQuantity === 0) {
      removeItemFromShipment(shipmentId, itemId);
      return;
    }

    setShipments(
      shipments.map((shipment) => {
        if (shipment.id !== shipmentId) return shipment;
        return {
          ...shipment,
          items: shipment.items.map((item) =>
            item.itemId === itemId ? { ...item, quantity: validQuantity } : item
          ),
        };
      })
    );
  };

  const updateShippingConfig = (
    shipmentId: string,
    field: string,
    value: string
  ) => {
    setShipments(
      shipments.map((shipment) =>
        shipment.id === shipmentId ? { ...shipment, [field]: value } : shipment
      )
    );
  };

  const getCarrierOptions = (carrierId: string) => {
    const carrier = carriers.find((c) => c.carrier_id === carrierId);
    return {
      services: carrier?.services || [],
      packages: carrier?.packages || [],
    };
  };

  const validateShipments = (): string[] => {
    const errors: string[] = [];

    shipments.forEach((shipment) => {
      if (packageMode) {
        const totalItemsInPackages = shipment.packages.reduce(
          (sum, pkg) => sum + pkg.items.length,
          0
        );
        if (totalItemsInPackages === 0) {
          errors.push(`${shipment.name} packages must have at least one item`);
        }
      } else if (shipment.items.length === 0) {
        errors.push(`${shipment.name} must have at least one item`);
      }

      if (shipment.items.length > 0 || packageMode) {
        if (!shipment.carrierId || !shipment.serviceCode) {
          errors.push(`${shipment.name} needs carrier and service selected`);
        }

        if (shipment.packages.length === 0) {
          errors.push(`${shipment.name} must have at least one package`);
        } else {
          shipment.packages.forEach((pkg, i) => {
            if (!pkg.packageCode) {
              errors.push(
                `${shipment.name} package ${i + 1} needs a package type`
              );
            }
            if (!pkg.weight || parseFloat(pkg.weight) <= 0) {
              errors.push(
                `${shipment.name} package ${i + 1} needs a valid weight`
              );
            }
          });
        }
      }
    });

    if (splitMode || packageMode) {
      const unallocatedItems = getAllocationSummary.filter(
        (item) => item.remaining > 0
      );
      if (unallocatedItems.length > 0) {
        errors.push(
          `Unallocated items: ${unallocatedItems
            .map((item) => `${item.sku} (${item.remaining})`)
            .join(", ")}`
        );
      }
    }

    return errors;
  };

  const processShipments = async () => {
    const validationErrors = validateShipments();
    if (validationErrors.length > 0) {
      setError(validationErrors.join("; "));
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const results = [];
      const validShipments = shipments.filter(
        (s) =>
          s.items.length > 0 ||
          (packageMode && s.packages.some((p) => p.items.length > 0))
      );

      const isMultiPackageSingleShipment =
        !splitMode &&
        validShipments.length === 1 &&
        validShipments[0].packages.length > 1;

      if (isMultiPackageSingleShipment) {
        const shipment = validShipments[0];
        const selectedCarrier = carriers.find(
          (c) => c.carrier_id === shipment.carrierId
        );

        if (!selectedCarrier) {
          throw new Error(`Carrier not found`);
        }

        let itemsToShip: ShipmentItem[];
        if (packageMode) {
          const itemsMap = new Map<string, ShipmentItem>();
          shipment.packages.forEach((pkg) => {
            pkg.items.forEach((item) => {
              const existing = itemsMap.get(item.itemId);
              if (existing) {
                existing.quantity += item.quantity;
              } else {
                itemsMap.set(item.itemId, { ...item });
              }
            });
          });
          itemsToShip = Array.from(itemsMap.values());
        } else {
          itemsToShip = shipment.items;
        }

        const distributeItemsAcrossPackages = () => {
          if (packageMode) {
            return shipment.packages.map((pkg) =>
              pkg.items.map((item) => ({
                productName: item.productName,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              }))
            );
          } else {
            const numPackages = shipment.packages.length;
            const packageItems: Array<Array<any>> = Array.from(
              { length: numPackages },
              () => []
            );

            itemsToShip.forEach((item) => {
              const qtyPerPackage = Math.floor(item.quantity / numPackages);
              const remainder = item.quantity % numPackages;

              for (let i = 0; i < numPackages; i++) {
                const qty = qtyPerPackage + (i < remainder ? 1 : 0);
                if (qty > 0) {
                  packageItems[i].push({
                    productName: item.productName,
                    sku: item.sku,
                    quantity: qty,
                    unitPrice: item.unitPrice,
                  });
                }
              }
            });

            return packageItems;
          }
        };

        const distributedItems = distributeItemsAcrossPackages();

        const shipmentData = {
          orderId: order.id,
          carrierCode: selectedCarrier.carrier_code,
          serviceCode: shipment.serviceCode,
          packages: shipment.packages.map((pkg, idx) => ({
            packageCode: pkg.packageCode,
            weight: parseFloat(pkg.weight),
            length: parseFloat(pkg.dimensions.length),
            width: parseFloat(pkg.dimensions.width),
            height: parseFloat(pkg.dimensions.height),
            items: distributedItems[idx],
          })),
          shippingAddress: {
            name: order.shippingAddress.name || order.customerName,
            address1: order.shippingAddress.address1,
            city: order.shippingAddress.city,
            zip: order.shippingAddress.zip,
            province: order.shippingAddress.province,
            province_code: order.shippingAddress.province_code,
            country_code: order.shippingAddress.country_code || "US",
          },
          notes: `Shipment - Items: ${itemsToShip
            .map((i) => `${i.sku}(${i.quantity})`)
            .join(", ")}`,
          items: itemsToShip.map((item) => ({
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };

        console.log(
          `📦 Creating ${shipment.packages.length} packages in ONE request`,
          JSON.stringify(shipmentData, null, 2)
        );

        const response = await fetch("/api/shipping/shipengine/create-label", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shipmentData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to create labels: ${errorData.error || response.statusText}`
          );
        }

        const result = await response.json();

        const labels = result.labels || [result.label];
        labels.forEach((label: any, idx: number) => {
          results.push({
            splitName: `Package ${idx + 1}`,
            trackingNumber: label.trackingNumber,
            labelUrl: label.labelUrl,
            cost: label.cost,
            carrier: selectedCarrier.friendly_name,
            items: distributedItems[idx],
          });

          // if (label?.labelUrl) {
          //   window.open(label.labelUrl, "_blank");
          // }
        });
      } else {
        for (const shipment of validShipments) {
          const selectedCarrier = carriers.find(
            (c) => c.carrier_id === shipment.carrierId
          );
          if (!selectedCarrier) {
            throw new Error(`Carrier not found for ${shipment.name}`);
          }

          let itemsToShip: ShipmentItem[];
          if (packageMode) {
            const itemsMap = new Map<string, ShipmentItem>();
            shipment.packages.forEach((pkg) => {
              pkg.items.forEach((item) => {
                const existing = itemsMap.get(item.itemId);
                if (existing) {
                  existing.quantity += item.quantity;
                } else {
                  itemsMap.set(item.itemId, { ...item });
                }
              });
            });
            itemsToShip = Array.from(itemsMap.values());
          } else {
            itemsToShip = shipment.items;
          }

          const shipmentData = {
            orderId: order.id,
            carrierCode: selectedCarrier.carrier_code,
            serviceCode: shipment.serviceCode,
            packages: shipment.packages.map((pkg) => ({
              packageCode: pkg.packageCode,
              weight: parseFloat(pkg.weight),
              length: parseFloat(pkg.dimensions.length),
              width: parseFloat(pkg.dimensions.width),
              height: parseFloat(pkg.dimensions.height),
              items: packageMode
                ? pkg.items.map((item) => ({
                    productName: item.productName,
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                  }))
                : itemsToShip.map((item) => ({
                    productName: item.productName,
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                  })),
            })),
            shippingAddress: {
              name: order.shippingAddress.name || order.customerName,
              address1: order.shippingAddress.address1,
              city: order.shippingAddress.city,
              zip: order.shippingAddress.zip,
              province: order.shippingAddress.province,
              province_code: order.shippingAddress.province_code,
              country_code: order.shippingAddress.country_code || "US",
            },
            notes:
              shipment.notes ||
              `${shipment.name} - Items: ${itemsToShip
                .map((i) => `${i.sku}(${i.quantity})`)
                .join(", ")}`,
            items: itemsToShip.map((item) => ({
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          };

          const response = await fetch(
            "/api/shipping/shipengine/create-label",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(shipmentData),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              `Failed to create ${shipment.name}: ${
                errorData.error || response.statusText
              }`
            );
          }

          const result = await response.json();
          results.push({
            splitName: shipment.name,
            trackingNumber: result.label.trackingNumber,
            labelUrl: result.label.labelUrl,
            cost: result.label.cost,
            carrier: selectedCarrier.friendly_name,
            items: itemsToShip,
          });

          // if (result.label?.labelUrl) {
          //   window.open(result.label.labelUrl, "_blank");
          // }
        }
      }

      if (onSuccess) {
        onSuccess(results);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const addMultiplePackagesWithWeightDistribution = (
    shipmentId: string,
    count: number
  ) => {
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) return;

    const totalWeightOz = shipment.items.reduce((sum, item) => {
      return sum + (item.weightOz || 0) * item.quantity;
    }, 0);
    const totalWeightLbs = totalWeightOz / 16;

    const weightPerPackage = (totalWeightLbs / count).toFixed(2);

    const firstPackage = shipment.packages[0];
    const defaultPackageCode = firstPackage?.packageCode || "";
    const defaultDimensions = firstPackage?.dimensions || {
      length: "12",
      width: "10",
      height: "6",
    };

    const newPackages: PackageConfig[] = [];
    for (let i = 0; i < count; i++) {
      newPackages.push({
        id: generateId(),
        packageCode: defaultPackageCode,
        weight: weightPerPackage,
        dimensions: { ...defaultDimensions },
        items: [],
      });
    }

    setShipments(
      shipments.map((s) =>
        s.id === shipmentId
          ? {
              ...s,
              packages: newPackages,
            }
          : s
      )
    );

    setNumberOfPackages("");
  };

  return (
    <div className={embedded ? "" : "p-3 sm:p-6"}>
      {/* Error Alert - Mobile Optimized */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm sm:text-base text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        {/* Mode Selection Buttons - Mobile Stacked */}
        {!splitMode &&
          !packageMode &&
          shipments.length === 1 &&
          shipments[0].carrierId && (
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              {isStampsCarrier(shipments[0].carrierId) && (
                <button
                  onClick={enableSplitMode}
                  className="cursor-pointer w-full sm:w-auto px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Split into Multiple Shipments
                </button>
              )}
              {isUPSCarrier(shipments[0].carrierId) && (
                <button
                  onClick={enablePackageMode}
                  className="cursor-pointer w-full sm:w-auto px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Split into Multiple Packages
                </button>
              )}
            </div>
          )}

        {/* Split Mode Layout */}
        {splitMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Order Items Column */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Order Items
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {getAllocationSummary.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-gray-800 p-3 rounded border"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          SKU: {item.sku}
                        </div>

                        <div className="flex flex-wrap items-center text-xs gap-x-4 gap-y-1">
                          <span className="text-gray-500">
                            Qty: {item.quantity}
                          </span>
                          <span className="text-blue-600">
                            Split: {item.allocated}
                          </span>
                          <span
                            className={`font-medium ${
                              item.remaining > 0
                                ? "text-blue-600"
                                : "text-green-600"
                            }`}
                          >
                            Available: {item.remaining}
                          </span>
                        </div>

                        {item.remaining > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full"
                                style={{
                                  width: `${
                                    (item.remaining / item.quantity) * 100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {item.remaining > 0 && (
                        <button
                          onClick={() =>
                            setSelectedItemForSplit({
                              itemId: item.id,
                              availableQty: item.remaining,
                            })
                          }
                          className="w-full sm:w-auto sm:ml-3 px-3 py-1.5 sm:py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Split
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipments Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold flex items-center">
                  <Truck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Shipments ({shipments.length})
                </h3>
                <button
                  onClick={createNewShipment}
                  className="cursor-pointer px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Add Shipment</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-96 overflow-y-auto">
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="border rounded-lg p-3 sm:p-4 bg-background"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">{shipment.name}</h4>
                      {shipments.length > 1 && (
                        <button
                          onClick={() => removeShipment(shipment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Shipment Items */}
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
                        Items ({shipment.items.length})
                      </h5>
                      {shipment.items.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">
                          No items added
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {shipment.items.map((item) => (
                            <div
                              key={item.itemId}
                              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{item.sku}</span>
                                <span className="text-gray-600 dark:text-gray-400 ml-2">
                                  Qty: {item.quantity}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <button
                                  onClick={() =>
                                    updateItemQuantityInShipment(
                                      shipment.id,
                                      item.itemId,
                                      item.quantity - 1
                                    )
                                  }
                                  className="w-6 h-6 sm:w-5 sm:h-5 border rounded flex items-center justify-center hover:bg-background"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 1;
                                    updateItemQuantityInShipment(
                                      shipment.id,
                                      item.itemId,
                                      value
                                    );
                                  }}
                                  className="w-10 sm:w-12 text-center px-1 py-0.5 border rounded text-xs"
                                />
                                <button
                                  onClick={() =>
                                    updateItemQuantityInShipment(
                                      shipment.id,
                                      item.itemId,
                                      item.quantity + 1
                                    )
                                  }
                                  className="cursor-pointer w-6 h-6 sm:w-5 sm:h-5 border rounded flex items-center justify-center hover:bg-background"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() =>
                                    removeItemFromShipment(
                                      shipment.id,
                                      item.itemId
                                    )
                                  }
                                  className="ml-1 text-red-600 hover:text-red-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Shipping Configuration */}
                    {shipment.items.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
                          Shipping Configuration
                        </h5>

                        <select
                          value={shipment.serviceCode}
                          onChange={(e) =>
                            updateShippingConfig(
                              shipment.id,
                              "serviceCode",
                              e.target.value
                            )
                          }
                          className="w-full px-2 py-1.5 sm:py-1 border rounded text-xs"
                        >
                          <option value="">Select Service</option>
                          {getCarrierOptions(shipment.carrierId).services.map(
                            (service) => (
                              <option
                                key={service.service_code}
                                value={service.service_code}
                              >
                                {service.name}
                              </option>
                            )
                          )}
                        </select>

                        {/* Package Details */}
                        <div className="space-y-3 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
                              Package
                            </h5>
                          </div>

                          {shipment.packages.map((pkg, pkgIndex) => (
                            <div
                              key={pkg.id}
                              className="border p-2 sm:p-3 rounded bg-gray-50 dark:bg-gray-800 space-y-2"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <select
                                  value={pkg.packageCode}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "packageCode",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                                >
                                  <option value="">Package Type</option>
                                  {getCarrierOptions(
                                    shipment.carrierId
                                  ).packages.map((option) => (
                                    <option
                                      key={option.package_code}
                                      value={option.package_code}
                                    >
                                      {option.name}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="Weight (lbs)"
                                  value={pkg.weight}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "weight",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="number"
                                  placeholder="L"
                                  value={pkg.dimensions.length}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "dimensions.length",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                                />
                                <input
                                  type="number"
                                  placeholder="W"
                                  value={pkg.dimensions.width}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "dimensions.width",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                                />
                                <input
                                  type="number"
                                  placeholder="H"
                                  value={pkg.dimensions.height}
                                  onChange={(e) =>
                                    updatePackageConfig(
                                      shipment.id,
                                      pkg.id,
                                      "dimensions.height",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Package Mode Layout */}
        {packageMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Order Items Column */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Order Items
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {getAllocationSummary.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 dark:bg-gray-800 p-3 rounded border"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          SKU: {item.sku}
                        </div>

                        <div className="flex flex-wrap items-center text-xs gap-x-4 gap-y-1">
                          <span className="text-gray-500">
                            Qty: {item.quantity}
                          </span>
                          <span className="text-purple-600">
                            Packed: {item.allocated}
                          </span>
                          <span
                            className={`font-medium ${
                              item.remaining > 0
                                ? "text-purple-600"
                                : "text-green-600"
                            }`}
                          >
                            Available: {item.remaining}
                          </span>
                        </div>

                        {item.remaining > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-purple-500 h-1.5 rounded-full"
                                style={{
                                  width: `${
                                    (item.remaining / item.quantity) * 100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {item.remaining > 0 && (
                        <button
                          onClick={() =>
                            setSelectedItemForSplit({
                              itemId: item.id,
                              availableQty: item.remaining,
                            })
                          }
                          className="w-full sm:w-auto sm:ml-3 px-3 py-1.5 sm:py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                        >
                          Add to Package
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Packages Column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold flex items-center">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Packages ({shipments[0]?.packages.length || 0})
                </h3>
                <button
                  onClick={() => addPackageToShipment(shipments[0].id)}
                  className="cursor-pointer px-2 sm:px-3 py-1 text-xs sm:text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">Add Package</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-96 overflow-y-auto">
                {shipments[0]?.packages.map((pkg, pkgIndex) => (
                  <div
                    key={pkg.id}
                    className="border rounded-lg p-3 sm:p-4 bg-background"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">
                        Package {pkgIndex + 1}
                      </h4>
                      {shipments[0].packages.length > 1 && (
                        <button
                          onClick={() =>
                            removePackageFromShipment(shipments[0].id, pkg.id)
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Package Items */}
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
                        Items ({pkg.items.length})
                      </h5>
                      {pkg.items.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">
                          No items added
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {pkg.items.map((item) => (
                            <div
                              key={item.itemId}
                              className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{item.sku}</span>
                                <span className="text-gray-600 dark:text-gray-400 ml-2">
                                  Qty: {item.quantity}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <button
                                  onClick={() =>
                                    updateItemQuantityInPackage(
                                      shipments[0].id,
                                      pkg.id,
                                      item.itemId,
                                      item.quantity - 1
                                    )
                                  }
                                  className="w-6 h-6 sm:w-5 sm:h-5 border rounded flex items-center justify-center hover:bg-background"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 1;
                                    updateItemQuantityInPackage(
                                      shipments[0].id,
                                      pkg.id,
                                      item.itemId,
                                      value
                                    );
                                  }}
                                  className="w-10 sm:w-12 text-center px-1 py-0.5 border rounded text-xs"
                                />
                                <button
                                  onClick={() =>
                                    updateItemQuantityInPackage(
                                      shipments[0].id,
                                      pkg.id,
                                      item.itemId,
                                      item.quantity + 1
                                    )
                                  }
                                  className="cursor-pointer w-6 h-6 sm:w-5 sm:h-5 border rounded flex items-center justify-center hover:bg-background"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() =>
                                    removeItemFromPackage(
                                      shipments[0].id,
                                      pkg.id,
                                      item.itemId
                                    )
                                  }
                                  className="ml-1 text-red-600 hover:text-red-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Package Details */}
                    <div className="space-y-3 pt-3 border-t">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
                        Package Details
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={pkg.packageCode}
                          onChange={(e) =>
                            updatePackageConfig(
                              shipments[0].id,
                              pkg.id,
                              "packageCode",
                              e.target.value
                            )
                          }
                          className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                        >
                          <option value="">Package Type</option>
                          {getCarrierOptions(
                            shipments[0].carrierId
                          ).packages.map((option) => (
                            <option
                              key={option.package_code}
                              value={option.package_code}
                            >
                              {option.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="0.1"
                          placeholder="Weight (lbs)"
                          value={pkg.weight}
                          onChange={(e) =>
                            updatePackageConfig(
                              shipments[0].id,
                              pkg.id,
                              "weight",
                              e.target.value
                            )
                          }
                          className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="L"
                          value={pkg.dimensions.length}
                          onChange={(e) =>
                            updatePackageConfig(
                              shipments[0].id,
                              pkg.id,
                              "dimensions.length",
                              e.target.value
                            )
                          }
                          className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                        />
                        <input
                          type="number"
                          placeholder="W"
                          value={pkg.dimensions.width}
                          onChange={(e) =>
                            updatePackageConfig(
                              shipments[0].id,
                              pkg.id,
                              "dimensions.width",
                              e.target.value
                            )
                          }
                          className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                        />
                        <input
                          type="number"
                          placeholder="H"
                          value={pkg.dimensions.height}
                          onChange={(e) =>
                            updatePackageConfig(
                              shipments[0].id,
                              pkg.id,
                              "dimensions.height",
                              e.target.value
                            )
                          }
                          className="border rounded px-2 py-1.5 sm:py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Standard Mode (not split or package) */}
        {!splitMode && !packageMode && shipments.length === 1 && (
          <div className="space-y-4">
            {shipments.map((shipment) => (
              <div key={shipment.id} className="space-y-4">
                {/* Carrier and Service Selection - Stacked on Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Carrier
                    </label>
                    <select
                      value={shipment.carrierId}
                      onChange={(e) =>
                        updateShippingConfig(
                          shipment.id,
                          "carrierId",
                          e.target.value
                        )
                      }
                      disabled={carriersLoading}
                      className="w-full px-3 py-2 border rounded text-sm sm:text-base"
                    >
                      <option value="">
                        {carriersLoading ? "Loading..." : "Select Carrier"}
                      </option>
                      {carriers.map((carrier) => (
                        <option
                          key={carrier.carrier_id}
                          value={carrier.carrier_id}
                        >
                          {carrier.friendly_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {shipment.carrierId && (
                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Service
                      </label>
                      <select
                        value={shipment.serviceCode}
                        onChange={(e) =>
                          updateShippingConfig(
                            shipment.id,
                            "serviceCode",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border rounded text-sm sm:text-base"
                      >
                        <option value="">Select Service</option>
                        {getCarrierOptions(shipment.carrierId).services.map(
                          (service) => (
                            <option
                              key={service.service_code}
                              value={service.service_code}
                            >
                              {service.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Package Details Section */}
                {shipment.carrierId && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                      <label className="text-sm font-medium">
                        Package Details
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={numberOfPackages}
                            onChange={(e) =>
                              setNumberOfPackages(e.target.value)
                            }
                            placeholder="# of packages"
                            className="w-full sm:w-32 px-2 py-1.5 sm:py-1 text-sm border rounded"
                          />
                          <button
                            onClick={() => {
                              const count = parseInt(numberOfPackages);
                              if (count > 0 && count <= 20) {
                                addMultiplePackagesWithWeightDistribution(
                                  shipment.id,
                                  count
                                );
                              }
                            }}
                            disabled={
                              !numberOfPackages ||
                              parseInt(numberOfPackages) <= 0
                            }
                            className="cursor-pointer px-3 py-1.5 sm:py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            Add {numberOfPackages || "X"}
                          </button>
                        </div>

                        {shipment.packages.length < 20 && (
                          <button
                            onClick={() => addPackageToShipment(shipment.id)}
                            className="cursor-pointer px-3 py-1.5 sm:py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Package
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Package List */}
                    <div className="space-y-3">
                      {shipment.packages.map((pkg, pkgIndex) => (
                        <div
                          key={pkg.id}
                          className="border p-3 sm:p-4 rounded bg-gray-50 dark:bg-zinc-800 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base font-medium text-emerald-500">
                              Package {pkgIndex + 1}
                            </span>
                            {shipment.packages.length > 1 && (
                              <button
                                onClick={() =>
                                  removePackageFromShipment(shipment.id, pkg.id)
                                }
                                className="text-red-600 hover:text-red-800 cursor-pointer p-1"
                              >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium block mb-1">
                                Package Type
                              </label>
                              <select
                                value={pkg.packageCode}
                                onChange={(e) =>
                                  updatePackageConfig(
                                    shipment.id,
                                    pkg.id,
                                    "packageCode",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border rounded text-sm"
                              >
                                <option value="">Select Type</option>
                                {getCarrierOptions(
                                  shipment.carrierId
                                ).packages.map((option) => (
                                  <option
                                    key={option.package_code}
                                    value={option.package_code}
                                  >
                                    {option.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-medium block mb-1">
                                Weight (lbs)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                value={pkg.weight}
                                onChange={(e) =>
                                  updatePackageConfig(
                                    shipment.id,
                                    pkg.id,
                                    "weight",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border rounded text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium block mb-1">
                              Dimensions (inches)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                placeholder="Length"
                                value={pkg.dimensions.length}
                                onChange={(e) =>
                                  updatePackageConfig(
                                    shipment.id,
                                    pkg.id,
                                    "dimensions.length",
                                    e.target.value
                                  )
                                }
                                className="px-2 sm:px-3 py-2 border rounded text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Width"
                                value={pkg.dimensions.width}
                                onChange={(e) =>
                                  updatePackageConfig(
                                    shipment.id,
                                    pkg.id,
                                    "dimensions.width",
                                    e.target.value
                                  )
                                }
                                className="px-2 sm:px-3 py-2 border rounded text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Height"
                                value={pkg.dimensions.height}
                                onChange={(e) =>
                                  updatePackageConfig(
                                    shipment.id,
                                    pkg.id,
                                    "dimensions.height",
                                    e.target.value
                                  )
                                }
                                className="px-2 sm:px-3 py-2 border rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons - Mobile Full Width */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end pt-4 border-t">
          {onCancel && (
            <button
              onClick={onCancel}
              className="cursor-pointer w-full sm:w-auto px-6 py-2.5 sm:py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              disabled={processing}
            >
              Cancel
            </button>
          )}
          <button
            onClick={processShipments}
            disabled={
              processing ||
              (packageMode
                ? shipments[0]?.packages.every((p) => p.items.length === 0)
                : shipments.every((s) => s.items.length === 0))
            }
            className="cursor-pointer w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span className="text-sm sm:text-base">Creating Labels...</span>
              </>
            ) : (
              <>
                <Truck className="w-5 h-5 mr-2" />
                <span className="text-sm sm:text-base">
                  Create{" "}
                  {packageMode
                    ? `Label (${shipments[0]?.packages.length || 0} packages)`
                    : shipments.filter((s) => s.items.length > 0).length > 1
                    ? `${
                        shipments.filter((s) => s.items.length > 0).length
                      } Labels`
                    : "Label"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Split Item Modal - Mobile Optimized */}
      {selectedItemForSplit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background p-4 sm:p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-base sm:text-lg font-semibold mb-4">
              {packageMode ? "Add Item to Package" : "Split Item"}
            </h3>

            {(() => {
              const item = order.items.find(
                (i) => i.id === selectedItemForSplit.itemId
              );
              return item ? (
                <div className="mb-4">
                  <p className="font-medium text-sm sm:text-base">
                    {item.productName}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    SKU: {item.sku}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Available: {selectedItemForSplit.availableQty} units
                  </p>
                </div>
              ) : null;
            })()}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Quantity to add:
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setSplitQuantity(Math.max(1, splitQuantity - 1))
                  }
                  className="cursor-pointer w-10 h-10 sm:w-8 sm:h-8 border rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedItemForSplit.availableQty}
                  value={splitQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setSplitQuantity(
                      Math.min(
                        selectedItemForSplit.availableQty,
                        Math.max(1, value)
                      )
                    );
                  }}
                  className="flex-1 text-center px-3 py-2 border rounded text-sm sm:text-base"
                />
                <button
                  onClick={() =>
                    setSplitQuantity(
                      Math.min(
                        selectedItemForSplit.availableQty,
                        splitQuantity + 1
                      )
                    )
                  }
                  className="cursor-pointer w-10 h-10 sm:w-8 sm:h-8 border rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {packageMode ? "Add to package:" : "Add to shipment:"}
              </label>
              <select
                className="w-full px-3 py-2 border rounded text-sm sm:text-base"
                onChange={(e) => {
                  if (e.target.value) {
                    if (packageMode) {
                      const [shipmentId, packageId] = e.target.value.split("|");
                      addItemToPackage(
                        shipmentId,
                        packageId,
                        selectedItemForSplit.itemId,
                        splitQuantity
                      );
                    } else {
                      addItemToShipment(
                        e.target.value,
                        selectedItemForSplit.itemId,
                        splitQuantity
                      );
                    }
                  }
                }}
                defaultValue=""
              >
                <option value="">
                  {packageMode ? "Select package..." : "Select shipment..."}
                </option>
                {packageMode
                  ? shipments[0]?.packages.map((pkg, idx) => (
                      <option
                        key={pkg.id}
                        value={`${shipments[0].id}|${pkg.id}`}
                      >
                        Package {idx + 1} ({pkg.items.length} items)
                      </option>
                    ))
                  : shipments.map((shipment) => (
                      <option key={shipment.id} value={shipment.id}>
                        {shipment.name} ({shipment.items.length} items)
                      </option>
                    ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3">
              <button
                onClick={() => {
                  setSelectedItemForSplit(null);
                  setSplitQuantity(1);
                }}
                className="cursor-pointer w-full sm:w-auto px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// "use client";

// import React, {
//   useState,
//   useEffect,
//   useCallback,
//   useMemo,
//   useRef,
// } from "react";
// import {
//   Plus,
//   Minus,
//   Package,
//   Truck,
//   AlertCircle,
//   Loader2,
//   X,
//   Check,
// } from "lucide-react";

// interface PackageConfig {
//   id: string;
//   packageCode: string;
//   weight: string;
//   dimensions: {
//     length: string;
//     width: string;
//     height: string;
//   };
//   items: ShipmentItem[];
// }

// interface Shipment {
//   id: string;
//   name: string;
//   items: ShipmentItem[];
//   carrierId: string;
//   serviceCode: string;
//   packages: PackageConfig[];
//   notes: string;
// }

// interface OrderItem {
//   id: string;
//   productName: string;
//   sku: string;
//   quantity: number;
//   unitPrice: string;
//   totalPrice: string;
//   weightOz?: number;
// }

// interface Order {
//   id: string;
//   orderNumber: string;
//   customerName: string;
//   customerEmail: string;
//   status: string;
//   totalAmount: string;
//   items: OrderItem[];
//   shippingAddress: {
//     address1: string;
//     city: string;
//     province: string;
//     province_code: string;
//     zip: string;
//     name?: string;
//     country?: string;
//     country_code?: string;
//   };
// }

// interface Carrier {
//   carrier_id: string;
//   carrier_code: string;
//   friendly_name: string;
//   services: Array<{
//     service_code: string;
//     name: string;
//   }>;
//   packages: Array<{
//     package_code: string;
//     name: string;
//   }>;
// }

// interface ShipmentItem {
//   itemId: string;
//   productName: string;
//   sku: string;
//   unitPrice: number;
//   quantity: number;
//   weightOz?: number;
// }

// interface ShippingLabelFormProps {
//   order: Order;
//   onSuccess?: (results: any[]) => void;
//   onCancel?: () => void;
//   embedded?: boolean;
//   initialWeight?: number;
//   initialDimensions?: {
//     length: number;
//     width: number;
//     height: number;
//   };
// }

// export default function ShippingLabelForm({
//   order,
//   onSuccess,
//   onCancel,
//   embedded = false,
//   initialWeight,
//   initialDimensions,
// }: ShippingLabelFormProps) {
//   const [carriers, setCarriers] = useState<Carrier[]>([]);
//   const [shipments, setShipments] = useState<Shipment[]>([]);
//   const [carriersLoading, setCarriersLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [processing, setProcessing] = useState(false);
//   const [selectedItemForSplit, setSelectedItemForSplit] = useState<{
//     itemId: string;
//     availableQty: number;
//   } | null>(null);
//   const [splitQuantity, setSplitQuantity] = useState(1);
//   const [splitMode, setSplitMode] = useState(false);
//   const [packageMode, setPackageMode] = useState(false);

//   const [numberOfPackages, setNumberOfPackages] = useState("");

//   const dimensionsAppliedRef = useRef(false);

//   const generateId = useCallback(
//     () => Date.now().toString(36) + Math.random().toString(36).substr(2),
//     []
//   );

//   const getRemainingQuantity = useCallback(
//     (itemId: string): number => {
//       const originalItem = order?.items.find((item) => item.id === itemId);
//       if (!originalItem) return 0;

//       if (packageMode && shipments.length > 0) {
//         const shipment = shipments[0];
//         const totalAllocated = shipment.packages.reduce((total, pkg) => {
//           return (
//             total +
//             pkg.items.reduce((pkgTotal, item) => {
//               return item.itemId === itemId
//                 ? pkgTotal + item.quantity
//                 : pkgTotal;
//             }, 0)
//           );
//         }, 0);
//         return originalItem.quantity - totalAllocated;
//       }

//       const totalAllocated = shipments.reduce((total, shipment) => {
//         return (
//           total +
//           shipment.items.reduce((shipmentTotal, item) => {
//             return item.itemId === itemId
//               ? shipmentTotal + item.quantity
//               : shipmentTotal;
//           }, 0)
//         );
//       }, 0);

//       return originalItem.quantity - totalAllocated;
//     },
//     [order, shipments, packageMode]
//   );

//   const getAllocationSummary = useMemo(() => {
//     if (!order) return [];

//     return order.items.map((item) => ({
//       ...item,
//       remaining: getRemainingQuantity(item.id),
//       allocated: item.quantity - getRemainingQuantity(item.id),
//     }));
//   }, [order, getRemainingQuantity]);

//   useEffect(() => {
//     loadCarriers();
//     initializeShipment();
//   }, []);

//   useEffect(() => {
//     if (
//       (initialDimensions || initialWeight) &&
//       shipments.length > 0 &&
//       !dimensionsAppliedRef.current
//     ) {
//       setShipments((prevShipments) => {
//         const updatedShipments = [...prevShipments];
//         const firstShipment = updatedShipments[0];

//         if (firstShipment && firstShipment.packages.length > 0) {
//           updatedShipments[0] = {
//             ...firstShipment,
//             packages: [
//               {
//                 ...firstShipment.packages[0],
//                 weight: initialWeight
//                   ? initialWeight.toString()
//                   : firstShipment.packages[0].weight,
//                 dimensions: {
//                   length:
//                     initialDimensions?.length?.toString() ||
//                     firstShipment.packages[0].dimensions.length,
//                   width:
//                     initialDimensions?.width?.toString() ||
//                     firstShipment.packages[0].dimensions.width,
//                   height:
//                     initialDimensions?.height?.toString() ||
//                     firstShipment.packages[0].dimensions.height,
//                 },
//               },
//               ...firstShipment.packages.slice(1),
//             ],
//           };
//         }

//         return updatedShipments;
//       });

//       dimensionsAppliedRef.current = true;
//     }
//   }, [initialWeight, initialDimensions, shipments.length]);

//   const loadCarriers = async () => {
//     try {
//       const response = await fetch("/api/carriers");
//       if (!response.ok) throw new Error("Failed to load carriers");
//       const carriersData = await response.json();
//       setCarriers(carriersData);
//     } catch (err) {
//       console.error("Failed to load carriers:", err);
//       setError("Failed to load carriers");
//     } finally {
//       setCarriersLoading(false);
//     }
//   };

//   const initializeShipment = () => {
//     const initialShipment: Shipment = {
//       id: generateId(),
//       name: "Shipment 1",
//       items: order.items.map((item) => ({
//         itemId: item.id,
//         productName: item.productName,
//         sku: item.sku,
//         unitPrice: parseFloat(item.unitPrice),
//         quantity: item.quantity,
//         weightOz: item.weightOz,
//       })),
//       carrierId: "",
//       serviceCode: "",
//       packages: [
//         {
//           id: generateId(),
//           packageCode: "",
//           weight: initialWeight ? initialWeight.toString() : "",
//           dimensions: {
//             length: initialDimensions?.length?.toString() || "12",
//             width: initialDimensions?.width?.toString() || "10",
//             height: initialDimensions?.height?.toString() || "6",
//           },
//           items: [],
//         },
//       ],
//       notes: "",
//     };

//     setShipments([initialShipment]);
//     dimensionsAppliedRef.current = false;
//   };

//   const isStampsCarrier = (carrierId: string): boolean => {
//     const carrier = carriers.find((c) => c.carrier_id === carrierId);
//     return carrier?.carrier_code === "stamps_com" || false;
//   };

//   const isUPSCarrier = (carrierId: string): boolean => {
//     const carrier = carriers.find((c) => c.carrier_id === carrierId);
//     return carrier?.carrier_code === "ups" || false;
//   };

//   const enablePackageMode = () => {
//     setPackageMode(true);
//     if (shipments.length === 1) {
//       const firstShipment = shipments[0];
//       setShipments([
//         {
//           ...firstShipment,
//           packages: [
//             firstShipment.packages[0],
//             {
//               id: generateId(),
//               packageCode: firstShipment.packages[0].packageCode,
//               weight: "",
//               dimensions: { length: "12", width: "10", height: "6" },
//               items: [],
//             },
//           ],
//         },
//       ]);
//     }
//   };

//   const enableSplitMode = () => {
//     setSplitMode(true);
//     if (shipments.length === 1) {
//       setShipments([
//         ...shipments,
//         {
//           id: generateId(),
//           name: "Shipment 2",
//           items: [],
//           carrierId: shipments[0].carrierId,
//           serviceCode: "",
//           packages: [
//             {
//               id: generateId(),
//               packageCode: "",
//               weight: "",
//               dimensions: { length: "12", width: "10", height: "6" },
//               items: [],
//             },
//           ],
//           notes: "",
//         },
//       ]);
//     }
//   };

//   const createNewShipment = () => {
//     const firstShipment = shipments[0];
//     const inheritedCarrierId = splitMode ? firstShipment?.carrierId || "" : "";

//     setShipments([
//       ...shipments,
//       {
//         id: generateId(),
//         name: `Shipment ${shipments.length + 1}`,
//         items: [],
//         carrierId: inheritedCarrierId,
//         serviceCode: "",
//         packages: [
//           {
//             id: generateId(),
//             packageCode: "",
//             weight: "",
//             dimensions: { length: "12", width: "10", height: "6" },
//             items: [],
//           },
//         ],
//         notes: "",
//       },
//     ]);
//   };

//   const addPackageToShipment = (shipmentId: string) => {
//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;

//         const firstPackage = shipment.packages[0];

//         // ✅ Calculate total weight and redistribute
//         const totalWeightOz = shipment.items.reduce((sum, item) => {
//           return sum + (item.weightOz || 0) * item.quantity;
//         }, 0);
//         const totalWeightLbs = totalWeightOz / 16;
//         const newPackageCount = shipment.packages.length + 1;
//         const weightPerPackage = (totalWeightLbs / newPackageCount).toFixed(2);

//         return {
//           ...shipment,
//           packages: [
//             ...shipment.packages.map((pkg) => ({
//               ...pkg,
//               weight: weightPerPackage,
//             })),
//             {
//               id: generateId(),
//               packageCode: firstPackage?.packageCode || "",
//               weight: weightPerPackage,
//               dimensions: { length: "12", width: "10", height: "6" },
//               items: [],
//             },
//           ],
//         };
//       })
//     );
//   };

//   const addMultiplePackages = (shipmentId: string, count: number) => {
//     const shipment = shipments.find((s) => s.id === shipmentId);
//     if (!shipment) return;

//     const firstPackage = shipment.packages[0];
//     const newPackages: PackageConfig[] = [];

//     for (let i = 0; i < count; i++) {
//       newPackages.push({
//         id: generateId(),
//         packageCode: firstPackage?.packageCode || "",
//         weight: "",
//         dimensions: { length: "12", width: "10", height: "6" },
//         items: [],
//       });
//     }

//     setShipments(
//       shipments.map((s) =>
//         s.id === shipmentId
//           ? {
//               ...s,
//               packages: [...s.packages, ...newPackages],
//             }
//           : s
//       )
//     );

//     setNumberOfPackages("");
//   };

//   const removePackageFromShipment = (shipmentId: string, packageId: string) => {
//     setShipments(
//       shipments.map((shipment) =>
//         shipment.id === shipmentId
//           ? {
//               ...shipment,
//               packages: shipment.packages.filter((p) => p.id !== packageId),
//             }
//           : shipment
//       )
//     );
//   };

//   const updatePackageConfig = (
//     shipmentId: string,
//     packageId: string,
//     field: string,
//     value: string
//   ) => {
//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;
//         return {
//           ...shipment,
//           packages: shipment.packages.map((pkg) =>
//             pkg.id === packageId
//               ? field.includes(".")
//                 ? {
//                     ...pkg,
//                     dimensions: {
//                       ...pkg.dimensions,
//                       [field.split(".")[1]]: value,
//                     },
//                   }
//                 : { ...pkg, [field]: value }
//               : pkg
//           ),
//         };
//       })
//     );
//   };

//   const removeShipment = (shipmentId: string) => {
//     if (shipments.length <= 1) return;

//     const updatedShipments = shipments.filter((s) => s.id !== shipmentId);

//     const renumberedShipments = updatedShipments.map((shipment, index) => ({
//       ...shipment,
//       name: `Shipment ${index + 1}`,
//     }));

//     setShipments(renumberedShipments);
//   };

//   const addItemToPackage = (
//     shipmentId: string,
//     packageId: string,
//     itemId: string,
//     quantity: number
//   ) => {
//     const originalItem = order?.items.find((item) => item.id === itemId);
//     if (!originalItem) return;

//     const remainingQty = getRemainingQuantity(itemId);
//     const validQuantity = Math.min(quantity, remainingQty);

//     if (validQuantity <= 0) return;

//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;

//         return {
//           ...shipment,
//           packages: shipment.packages.map((pkg) => {
//             if (pkg.id !== packageId) return pkg;

//             const existingItemIndex = pkg.items.findIndex(
//               (item) => item.itemId === itemId
//             );

//             if (existingItemIndex >= 0) {
//               const updatedItems = [...pkg.items];
//               updatedItems[existingItemIndex] = {
//                 ...updatedItems[existingItemIndex],
//                 quantity:
//                   updatedItems[existingItemIndex].quantity + validQuantity,
//               };
//               return { ...pkg, items: updatedItems };
//             } else {
//               const newItem: ShipmentItem = {
//                 itemId: originalItem.id,
//                 productName: originalItem.productName,
//                 sku: originalItem.sku,
//                 unitPrice: parseFloat(originalItem.unitPrice),
//                 quantity: validQuantity,
//                 weightOz: originalItem.weightOz,
//               };
//               return { ...pkg, items: [...pkg.items, newItem] };
//             }
//           }),
//         };
//       })
//     );

//     setSelectedItemForSplit(null);
//     setSplitQuantity(1);
//   };

//   const addItemToShipment = (
//     shipmentId: string,
//     itemId: string,
//     quantity: number
//   ) => {
//     const originalItem = order?.items.find((item) => item.id === itemId);
//     if (!originalItem) return;

//     const remainingQty = getRemainingQuantity(itemId);
//     const validQuantity = Math.min(quantity, remainingQty);

//     if (validQuantity <= 0) return;

//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;

//         const existingItemIndex = shipment.items.findIndex(
//           (item) => item.itemId === itemId
//         );

//         if (existingItemIndex >= 0) {
//           const updatedItems = [...shipment.items];
//           updatedItems[existingItemIndex] = {
//             ...updatedItems[existingItemIndex],
//             quantity: updatedItems[existingItemIndex].quantity + validQuantity,
//           };
//           return { ...shipment, items: updatedItems };
//         } else {
//           const newItem: ShipmentItem = {
//             itemId: originalItem.id,
//             productName: originalItem.productName,
//             sku: originalItem.sku,
//             unitPrice: parseFloat(originalItem.unitPrice),
//             quantity: validQuantity,
//             weightOz: originalItem.weightOz,
//           };
//           return { ...shipment, items: [...shipment.items, newItem] };
//         }
//       })
//     );

//     setSelectedItemForSplit(null);
//     setSplitQuantity(1);
//   };

//   const removeItemFromPackage = (
//     shipmentId: string,
//     packageId: string,
//     itemId: string
//   ) => {
//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;
//         return {
//           ...shipment,
//           packages: shipment.packages.map((pkg) =>
//             pkg.id === packageId
//               ? {
//                   ...pkg,
//                   items: pkg.items.filter((item) => item.itemId !== itemId),
//                 }
//               : pkg
//           ),
//         };
//       })
//     );
//   };

//   const removeItemFromShipment = (shipmentId: string, itemId: string) => {
//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;
//         return {
//           ...shipment,
//           items: shipment.items.filter((item) => item.itemId !== itemId),
//         };
//       })
//     );
//   };

//   const updateItemQuantityInPackage = (
//     shipmentId: string,
//     packageId: string,
//     itemId: string,
//     newQuantity: number
//   ) => {
//     const remainingQty = getRemainingQuantity(itemId);
//     const currentShipment = shipments.find((s) => s.id === shipmentId);
//     const currentPackage = currentShipment?.packages.find(
//       (p) => p.id === packageId
//     );
//     const currentItem = currentPackage?.items.find((i) => i.itemId === itemId);
//     const maxAllowed = remainingQty + (currentItem?.quantity || 0);

//     const validQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

//     if (validQuantity === 0) {
//       removeItemFromPackage(shipmentId, packageId, itemId);
//       return;
//     }

//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;
//         return {
//           ...shipment,
//           packages: shipment.packages.map((pkg) =>
//             pkg.id === packageId
//               ? {
//                   ...pkg,
//                   items: pkg.items.map((item) =>
//                     item.itemId === itemId
//                       ? { ...item, quantity: validQuantity }
//                       : item
//                   ),
//                 }
//               : pkg
//           ),
//         };
//       })
//     );
//   };

//   const updateItemQuantityInShipment = (
//     shipmentId: string,
//     itemId: string,
//     newQuantity: number
//   ) => {
//     const remainingQty = getRemainingQuantity(itemId);
//     const currentShipment = shipments.find((s) => s.id === shipmentId);
//     const currentItem = currentShipment?.items.find((i) => i.itemId === itemId);
//     const maxAllowed = remainingQty + (currentItem?.quantity || 0);

//     const validQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

//     if (validQuantity === 0) {
//       removeItemFromShipment(shipmentId, itemId);
//       return;
//     }

//     setShipments(
//       shipments.map((shipment) => {
//         if (shipment.id !== shipmentId) return shipment;
//         return {
//           ...shipment,
//           items: shipment.items.map((item) =>
//             item.itemId === itemId ? { ...item, quantity: validQuantity } : item
//           ),
//         };
//       })
//     );
//   };

//   const updateShippingConfig = (
//     shipmentId: string,
//     field: string,
//     value: string
//   ) => {
//     setShipments(
//       shipments.map((shipment) =>
//         shipment.id === shipmentId ? { ...shipment, [field]: value } : shipment
//       )
//     );
//   };

//   const getCarrierOptions = (carrierId: string) => {
//     const carrier = carriers.find((c) => c.carrier_id === carrierId);
//     return {
//       services: carrier?.services || [],
//       packages: carrier?.packages || [],
//     };
//   };

//   const validateShipments = (): string[] => {
//     const errors: string[] = [];

//     shipments.forEach((shipment) => {
//       if (packageMode) {
//         const totalItemsInPackages = shipment.packages.reduce(
//           (sum, pkg) => sum + pkg.items.length,
//           0
//         );
//         if (totalItemsInPackages === 0) {
//           errors.push(`${shipment.name} packages must have at least one item`);
//         }
//       } else if (shipment.items.length === 0) {
//         errors.push(`${shipment.name} must have at least one item`);
//       }

//       if (shipment.items.length > 0 || packageMode) {
//         if (!shipment.carrierId || !shipment.serviceCode) {
//           errors.push(`${shipment.name} needs carrier and service selected`);
//         }

//         if (shipment.packages.length === 0) {
//           errors.push(`${shipment.name} must have at least one package`);
//         } else {
//           shipment.packages.forEach((pkg, i) => {
//             if (!pkg.packageCode) {
//               errors.push(
//                 `${shipment.name} package ${i + 1} needs a package type`
//               );
//             }
//             if (!pkg.weight || parseFloat(pkg.weight) <= 0) {
//               errors.push(
//                 `${shipment.name} package ${i + 1} needs a valid weight`
//               );
//             }
//           });
//         }
//       }
//     });

//     if (splitMode || packageMode) {
//       const unallocatedItems = getAllocationSummary.filter(
//         (item) => item.remaining > 0
//       );
//       if (unallocatedItems.length > 0) {
//         errors.push(
//           `Unallocated items: ${unallocatedItems
//             .map((item) => `${item.sku} (${item.remaining})`)
//             .join(", ")}`
//         );
//       }
//     }

//     return errors;
//   };

//   const processShipments = async () => {
//     const validationErrors = validateShipments();
//     if (validationErrors.length > 0) {
//       setError(validationErrors.join("; "));
//       return;
//     }

//     setProcessing(true);
//     setError("");

//     try {
//       const results = [];
//       const validShipments = shipments.filter(
//         (s) =>
//           s.items.length > 0 ||
//           (packageMode && s.packages.some((p) => p.items.length > 0))
//       );

//       const isMultiPackageSingleShipment =
//         !splitMode &&
//         validShipments.length === 1 &&
//         validShipments[0].packages.length > 1;

//       if (isMultiPackageSingleShipment) {
//         const shipment = validShipments[0];
//         const selectedCarrier = carriers.find(
//           (c) => c.carrier_id === shipment.carrierId
//         );

//         if (!selectedCarrier) {
//           throw new Error(`Carrier not found`);
//         }

//         let itemsToShip: ShipmentItem[];
//         if (packageMode) {
//           const itemsMap = new Map<string, ShipmentItem>();
//           shipment.packages.forEach((pkg) => {
//             pkg.items.forEach((item) => {
//               const existing = itemsMap.get(item.itemId);
//               if (existing) {
//                 existing.quantity += item.quantity;
//               } else {
//                 itemsMap.set(item.itemId, { ...item });
//               }
//             });
//           });
//           itemsToShip = Array.from(itemsMap.values());
//         } else {
//           itemsToShip = shipment.items;
//         }

//         // ✅ NEW: Distribute items evenly across packages when NOT in packageMode
//         const distributeItemsAcrossPackages = () => {
//           if (packageMode) {
//             // Package mode: use the items already assigned to each package
//             return shipment.packages.map((pkg) =>
//               pkg.items.map((item) => ({
//                 productName: item.productName,
//                 sku: item.sku,
//                 quantity: item.quantity,
//                 unitPrice: item.unitPrice,
//               }))
//             );
//           } else {
//             // Regular mode: distribute items evenly across packages
//             const numPackages = shipment.packages.length;
//             const packageItems: Array<Array<any>> = Array.from(
//               { length: numPackages },
//               () => []
//             );

//             itemsToShip.forEach((item) => {
//               const qtyPerPackage = Math.floor(item.quantity / numPackages);
//               const remainder = item.quantity % numPackages;

//               for (let i = 0; i < numPackages; i++) {
//                 const qty = qtyPerPackage + (i < remainder ? 1 : 0);
//                 if (qty > 0) {
//                   packageItems[i].push({
//                     productName: item.productName,
//                     sku: item.sku,
//                     quantity: qty,
//                     unitPrice: item.unitPrice,
//                   });
//                 }
//               }
//             });

//             return packageItems;
//           }
//         };

//         const distributedItems = distributeItemsAcrossPackages();

//         // ✅ Send packages with properly distributed items
//         const shipmentData = {
//           orderId: order.id,
//           carrierCode: selectedCarrier.carrier_code,
//           serviceCode: shipment.serviceCode,
//           packages: shipment.packages.map((pkg, idx) => ({
//             packageCode: pkg.packageCode,
//             weight: parseFloat(pkg.weight),
//             length: parseFloat(pkg.dimensions.length),
//             width: parseFloat(pkg.dimensions.width),
//             height: parseFloat(pkg.dimensions.height),
//             items: distributedItems[idx], // ✅ Use distributed items for this specific package
//           })),
//           shippingAddress: {
//             name: order.shippingAddress.name || order.customerName,
//             address1: order.shippingAddress.address1,
//             city: order.shippingAddress.city,
//             zip: order.shippingAddress.zip,
//             province: order.shippingAddress.province,
//             province_code: order.shippingAddress.province_code,
//             country_code: order.shippingAddress.country_code || "US",
//           },
//           notes: `Shipment - Items: ${itemsToShip
//             .map((i) => `${i.sku}(${i.quantity})`)
//             .join(", ")}`,
//           items: itemsToShip.map((item) => ({
//             productName: item.productName,
//             sku: item.sku,
//             quantity: item.quantity,
//             unitPrice: item.unitPrice,
//           })),
//         };

//         console.log(
//           `📦 Creating ${shipment.packages.length} packages in ONE request`,
//           JSON.stringify(shipmentData, null, 2)
//         );

//         const response = await fetch("/api/shipping/shipengine/create-label", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(shipmentData),
//         });

//         if (!response.ok) {
//           const errorData = await response.json();
//           throw new Error(
//             `Failed to create labels: ${errorData.error || response.statusText}`
//           );
//         }

//         const result = await response.json();

//         const labels = result.labels || [result.label];
//         labels.forEach((label: any, idx: number) => {
//           results.push({
//             splitName: `Package ${idx + 1}`,
//             trackingNumber: label.trackingNumber,
//             labelUrl: label.labelUrl,
//             cost: label.cost,
//             carrier: selectedCarrier.friendly_name,
//             items: distributedItems[idx],
//           });

//           if (label?.labelUrl) {
//             window.open(label.labelUrl, "_blank");
//           }
//         });
//       } else {
//         // ✅ Handle split shipments (multiple separate shipments)
//         for (const shipment of validShipments) {
//           const selectedCarrier = carriers.find(
//             (c) => c.carrier_id === shipment.carrierId
//           );
//           if (!selectedCarrier) {
//             throw new Error(`Carrier not found for ${shipment.name}`);
//           }

//           let itemsToShip: ShipmentItem[];
//           if (packageMode) {
//             const itemsMap = new Map<string, ShipmentItem>();
//             shipment.packages.forEach((pkg) => {
//               pkg.items.forEach((item) => {
//                 const existing = itemsMap.get(item.itemId);
//                 if (existing) {
//                   existing.quantity += item.quantity;
//                 } else {
//                   itemsMap.set(item.itemId, { ...item });
//                 }
//               });
//             });
//             itemsToShip = Array.from(itemsMap.values());
//           } else {
//             itemsToShip = shipment.items;
//           }

//           const shipmentData = {
//             orderId: order.id,
//             carrierCode: selectedCarrier.carrier_code,
//             serviceCode: shipment.serviceCode,
//             packages: shipment.packages.map((pkg) => ({
//               packageCode: pkg.packageCode,
//               weight: parseFloat(pkg.weight),
//               length: parseFloat(pkg.dimensions.length),
//               width: parseFloat(pkg.dimensions.width),
//               height: parseFloat(pkg.dimensions.height),
//               items: packageMode
//                 ? pkg.items.map((item) => ({
//                     productName: item.productName,
//                     sku: item.sku,
//                     quantity: item.quantity,
//                     unitPrice: item.unitPrice,
//                   }))
//                 : itemsToShip.map((item) => ({
//                     productName: item.productName,
//                     sku: item.sku,
//                     quantity: item.quantity,
//                     unitPrice: item.unitPrice,
//                   })),
//             })),
//             shippingAddress: {
//               name: order.shippingAddress.name || order.customerName,
//               address1: order.shippingAddress.address1,
//               city: order.shippingAddress.city,
//               zip: order.shippingAddress.zip,
//               province: order.shippingAddress.province,
//               province_code: order.shippingAddress.province_code,
//               country_code: order.shippingAddress.country_code || "US",
//             },
//             notes:
//               shipment.notes ||
//               `${shipment.name} - Items: ${itemsToShip
//                 .map((i) => `${i.sku}(${i.quantity})`)
//                 .join(", ")}`,
//             items: itemsToShip.map((item) => ({
//               productName: item.productName,
//               sku: item.sku,
//               quantity: item.quantity,
//               unitPrice: item.unitPrice,
//             })),
//           };

//           const response = await fetch(
//             "/api/shipping/shipengine/create-label",
//             {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify(shipmentData),
//             }
//           );

//           if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(
//               `Failed to create ${shipment.name}: ${
//                 errorData.error || response.statusText
//               }`
//             );
//           }

//           const result = await response.json();
//           results.push({
//             splitName: shipment.name,
//             trackingNumber: result.label.trackingNumber,
//             labelUrl: result.label.labelUrl,
//             cost: result.label.cost,
//             carrier: selectedCarrier.friendly_name,
//             items: itemsToShip,
//           });

//           if (result.label?.labelUrl) {
//             window.open(result.label.labelUrl, "_blank");
//           }
//         }
//       }

//       if (onSuccess) {
//         onSuccess(results);
//       }
//     } catch (err) {
//       const message = err instanceof Error ? err.message : "Unknown error";
//       setError(message);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const addMultiplePackagesWithWeightDistribution = (
//     shipmentId: string,
//     count: number
//   ) => {
//     const shipment = shipments.find((s) => s.id === shipmentId);
//     if (!shipment) return;

//     const totalWeightOz = shipment.items.reduce((sum, item) => {
//       return sum + (item.weightOz || 0) * item.quantity;
//     }, 0);
//     const totalWeightLbs = totalWeightOz / 16;

//     const weightPerPackage = (totalWeightLbs / count).toFixed(2);

//     const firstPackage = shipment.packages[0];
//     const defaultPackageCode = firstPackage?.packageCode || "";
//     const defaultDimensions = firstPackage?.dimensions || {
//       length: "12",
//       width: "10",
//       height: "6",
//     };

//     const newPackages: PackageConfig[] = [];
//     for (let i = 0; i < count; i++) {
//       newPackages.push({
//         id: generateId(),
//         packageCode: defaultPackageCode,
//         weight: weightPerPackage,
//         dimensions: { ...defaultDimensions },
//         items: [],
//       });
//     }

//     setShipments(
//       shipments.map((s) =>
//         s.id === shipmentId
//           ? {
//               ...s,
//               packages: newPackages,
//             }
//           : s
//       )
//     );

//     setNumberOfPackages("");
//   };

//   return (
//     <div className={embedded ? "" : "p-6"}>
//       {error && (
//         <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
//           <div className="flex items-center">
//             <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
//             <span className="text-red-800">{error}</span>
//           </div>
//         </div>
//       )}

//       <div className="space-y-6">
//         {!splitMode &&
//           !packageMode &&
//           shipments.length === 1 &&
//           shipments[0].carrierId && (
//             <div className="flex justify-end gap-3">
//               {isStampsCarrier(shipments[0].carrierId) && (
//                 <button
//                   onClick={enableSplitMode}
//                   className="cursor-pointer px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
//                 >
//                   <Package className="w-4 h-4 mr-2" />
//                   Split into Multiple Shipments
//                 </button>
//               )}
//               {isUPSCarrier(shipments[0].carrierId) && (
//                 <button
//                   onClick={enablePackageMode}
//                   className="cursor-pointer px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
//                 >
//                   <Package className="w-4 h-4 mr-2" />
//                   Split into Multiple Packages
//                 </button>
//               )}
//             </div>
//           )}

//         {splitMode && (
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             <div>
//               <h3 className="font-semibold mb-3 flex items-center">
//                 <Package className="w-5 h-5 mr-2" />
//                 Order Items
//               </h3>
//               <div className="space-y-3">
//                 {getAllocationSummary.map((item) => (
//                   <div
//                     key={item.id}
//                     className="bg-gray-50 dark:bg-gray-800 p-3 rounded border"
//                   >
//                     <div className="flex justify-between items-start">
//                       <div className="flex-1">
//                         <div className="font-medium text-sm">
//                           {item.productName}
//                         </div>
//                         <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
//                           SKU: {item.sku}
//                         </div>

//                         <div className="flex items-center text-xs space-x-4">
//                           <span className="text-gray-500">
//                             Qty: {item.quantity}
//                           </span>
//                           <span className="text-blue-600">
//                             Split: {item.allocated}
//                           </span>
//                           <span
//                             className={`font-medium ${
//                               item.remaining > 0
//                                 ? "text-blue-600"
//                                 : "text-green-600"
//                             }`}
//                           >
//                             Available: {item.remaining}
//                           </span>
//                         </div>

//                         {item.remaining > 0 && (
//                           <div className="mt-2">
//                             <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
//                               <div
//                                 className="bg-blue-500 h-1.5 rounded-full"
//                                 style={{
//                                   width: `${
//                                     (item.remaining / item.quantity) * 100
//                                   }%`,
//                                 }}
//                               />
//                             </div>
//                           </div>
//                         )}
//                       </div>

//                       {item.remaining > 0 && (
//                         <button
//                           onClick={() =>
//                             setSelectedItemForSplit({
//                               itemId: item.id,
//                               availableQty: item.remaining,
//                             })
//                           }
//                           className="ml-3 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
//                         >
//                           Split
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div>
//               <div className="flex items-center justify-between mb-3">
//                 <h3 className="font-semibold flex items-center">
//                   <Truck className="w-5 h-5 mr-2" />
//                   Shipments ({shipments.length})
//                 </h3>
//                 <button
//                   onClick={createNewShipment}
//                   className="cursor-pointer px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
//                 >
//                   <Plus className="w-4 h-4 mr-1" />
//                   Add Shipment
//                 </button>
//               </div>

//               <div className="space-y-4 max-h-96 overflow-y-auto">
//                 {shipments.map((shipment) => (
//                   <div
//                     key={shipment.id}
//                     className="border rounded-lg p-4 bg-background"
//                   >
//                     <div className="flex items-center justify-between mb-3">
//                       <h4 className="font-medium text-sm">{shipment.name}</h4>
//                       {shipments.length > 1 && (
//                         <button
//                           onClick={() => removeShipment(shipment.id)}
//                           className="text-red-600 hover:text-red-800"
//                         >
//                           <X className="w-4 h-4" />
//                         </button>
//                       )}
//                     </div>

//                     <div className="mb-4">
//                       <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
//                         Items ({shipment.items.length})
//                       </h5>
//                       {shipment.items.length === 0 ? (
//                         <p className="text-xs text-gray-500 italic">
//                           No items added
//                         </p>
//                       ) : (
//                         <div className="space-y-2">
//                           {shipment.items.map((item) => (
//                             <div
//                               key={item.itemId}
//                               className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs"
//                             >
//                               <div>
//                                 <span className="font-medium">{item.sku}</span>
//                                 <span className="text-gray-600 dark:text-gray-400 ml-2">
//                                   Qty: {item.quantity}
//                                 </span>
//                               </div>
//                               <div className="flex items-center space-x-1">
//                                 <button
//                                   onClick={() =>
//                                     updateItemQuantityInShipment(
//                                       shipment.id,
//                                       item.itemId,
//                                       item.quantity - 1
//                                     )
//                                   }
//                                   className="w-5 h-5 border rounded flex items-center justify-center hover:bg-background"
//                                 >
//                                   <Minus className="w-3 h-3" />
//                                 </button>
//                                 <input
//                                   type="number"
//                                   min="1"
//                                   value={item.quantity}
//                                   onChange={(e) => {
//                                     const value = parseInt(e.target.value) || 1;
//                                     updateItemQuantityInShipment(
//                                       shipment.id,
//                                       item.itemId,
//                                       value
//                                     );
//                                   }}
//                                   className="w-12 text-center px-1 py-0.5 border rounded text-xs"
//                                 />
//                                 <button
//                                   onClick={() =>
//                                     updateItemQuantityInShipment(
//                                       shipment.id,
//                                       item.itemId,
//                                       item.quantity + 1
//                                     )
//                                   }
//                                   className="cursor-pointer w-5 h-5 border rounded flex items-center justify-center hover:bg-background"
//                                 >
//                                   <Plus className="w-3 h-3" />
//                                 </button>
//                                 <button
//                                   onClick={() =>
//                                     removeItemFromShipment(
//                                       shipment.id,
//                                       item.itemId
//                                     )
//                                   }
//                                   className="ml-2 text-red-600 hover:text-red-800"
//                                 >
//                                   <X className="w-3 h-3" />
//                                 </button>
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       )}
//                     </div>

//                     {shipment.items.length > 0 && (
//                       <div className="space-y-3">
//                         <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
//                           Shipping Configuration
//                         </h5>

//                         <select
//                           value={shipment.serviceCode}
//                           onChange={(e) =>
//                             updateShippingConfig(
//                               shipment.id,
//                               "serviceCode",
//                               e.target.value
//                             )
//                           }
//                           className="w-full px-2 py-1 border rounded text-xs"
//                         >
//                           <option value="">Select Service</option>
//                           {getCarrierOptions(shipment.carrierId).services.map(
//                             (service) => (
//                               <option
//                                 key={service.service_code}
//                                 value={service.service_code}
//                               >
//                                 {service.name}
//                               </option>
//                             )
//                           )}
//                         </select>

//                         <div className="space-y-3 pt-2 border-t">
//                           <div className="flex items-center justify-between">
//                             <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
//                               Package
//                             </h5>
//                           </div>

//                           {shipment.packages.map((pkg, pkgIndex) => (
//                             <div
//                               key={pkg.id}
//                               className="border p-3 rounded bg-gray-50 dark:bg-gray-800 space-y-2"
//                             >
//                               <div className="grid grid-cols-2 gap-2">
//                                 <select
//                                   value={pkg.packageCode}
//                                   onChange={(e) =>
//                                     updatePackageConfig(
//                                       shipment.id,
//                                       pkg.id,
//                                       "packageCode",
//                                       e.target.value
//                                     )
//                                   }
//                                   className="border rounded px-2 py-1 text-xs"
//                                 >
//                                   <option value="">Package Type</option>
//                                   {getCarrierOptions(
//                                     shipment.carrierId
//                                   ).packages.map((option) => (
//                                     <option
//                                       key={option.package_code}
//                                       value={option.package_code}
//                                     >
//                                       {option.name}
//                                     </option>
//                                   ))}
//                                 </select>

//                                 <input
//                                   type="number"
//                                   step="0.1"
//                                   placeholder="Weight (lbs)"
//                                   value={pkg.weight}
//                                   onChange={(e) =>
//                                     updatePackageConfig(
//                                       shipment.id,
//                                       pkg.id,
//                                       "weight",
//                                       e.target.value
//                                     )
//                                   }
//                                   className="border rounded px-2 py-1 text-xs"
//                                 />
//                               </div>

//                               <div className="grid grid-cols-3 gap-2">
//                                 <input
//                                   type="number"
//                                   placeholder="L"
//                                   value={pkg.dimensions.length}
//                                   onChange={(e) =>
//                                     updatePackageConfig(
//                                       shipment.id,
//                                       pkg.id,
//                                       "dimensions.length",
//                                       e.target.value
//                                     )
//                                   }
//                                   className="border rounded px-2 py-1 text-xs"
//                                 />
//                                 <input
//                                   type="number"
//                                   placeholder="W"
//                                   value={pkg.dimensions.width}
//                                   onChange={(e) =>
//                                     updatePackageConfig(
//                                       shipment.id,
//                                       pkg.id,
//                                       "dimensions.width",
//                                       e.target.value
//                                     )
//                                   }
//                                   className="border rounded px-2 py-1 text-xs"
//                                 />
//                                 <input
//                                   type="number"
//                                   placeholder="H"
//                                   value={pkg.dimensions.height}
//                                   onChange={(e) =>
//                                     updatePackageConfig(
//                                       shipment.id,
//                                       pkg.id,
//                                       "dimensions.height",
//                                       e.target.value
//                                     )
//                                   }
//                                   className="border rounded px-2 py-1 text-xs"
//                                 />
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}

//         {packageMode && (
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             <div>
//               <h3 className="font-semibold mb-3 flex items-center">
//                 <Package className="w-5 h-5 mr-2" />
//                 Order Items
//               </h3>
//               <div className="space-y-3">
//                 {getAllocationSummary.map((item) => (
//                   <div
//                     key={item.id}
//                     className="bg-gray-50 dark:bg-gray-800 p-3 rounded border"
//                   >
//                     <div className="flex justify-between items-start">
//                       <div className="flex-1">
//                         <div className="font-medium text-sm">
//                           {item.productName}
//                         </div>
//                         <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
//                           SKU: {item.sku}
//                         </div>

//                         <div className="flex items-center text-xs space-x-4">
//                           <span className="text-gray-500">
//                             Qty: {item.quantity}
//                           </span>
//                           <span className="text-purple-600">
//                             Packed: {item.allocated}
//                           </span>
//                           <span
//                             className={`font-medium ${
//                               item.remaining > 0
//                                 ? "text-purple-600"
//                                 : "text-green-600"
//                             }`}
//                           >
//                             Available: {item.remaining}
//                           </span>
//                         </div>

//                         {item.remaining > 0 && (
//                           <div className="mt-2">
//                             <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
//                               <div
//                                 className="bg-purple-500 h-1.5 rounded-full"
//                                 style={{
//                                   width: `${
//                                     (item.remaining / item.quantity) * 100
//                                   }%`,
//                                 }}
//                               />
//                             </div>
//                           </div>
//                         )}
//                       </div>

//                       {item.remaining > 0 && (
//                         <button
//                           onClick={() =>
//                             setSelectedItemForSplit({
//                               itemId: item.id,
//                               availableQty: item.remaining,
//                             })
//                           }
//                           className="ml-3 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
//                         >
//                           Add to Package
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div>
//               <div className="flex items-center justify-between mb-3">
//                 <h3 className="font-semibold flex items-center">
//                   <Package className="w-5 h-5 mr-2" />
//                   Packages ({shipments[0]?.packages.length || 0})
//                 </h3>
//                 <button
//                   onClick={() => addPackageToShipment(shipments[0].id)}
//                   className="cursor-pointer px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
//                 >
//                   <Plus className="w-4 h-4 mr-1" />
//                   Add Package
//                 </button>
//               </div>

//               <div className="space-y-4 max-h-96 overflow-y-auto">
//                 {shipments[0]?.packages.map((pkg, pkgIndex) => (
//                   <div
//                     key={pkg.id}
//                     className="border rounded-lg p-4 bg-background"
//                   >
//                     <div className="flex items-center justify-between mb-3">
//                       <h4 className="font-medium text-sm">
//                         Package {pkgIndex + 1}
//                       </h4>
//                       {shipments[0].packages.length > 1 && (
//                         <button
//                           onClick={() =>
//                             removePackageFromShipment(shipments[0].id, pkg.id)
//                           }
//                           className="text-red-600 hover:text-red-800"
//                         >
//                           <X className="w-4 h-4" />
//                         </button>
//                       )}
//                     </div>

//                     <div className="mb-4">
//                       <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-2">
//                         Items ({pkg.items.length})
//                       </h5>
//                       {pkg.items.length === 0 ? (
//                         <p className="text-xs text-gray-500 italic">
//                           No items added
//                         </p>
//                       ) : (
//                         <div className="space-y-2">
//                           {pkg.items.map((item) => (
//                             <div
//                               key={item.itemId}
//                               className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs"
//                             >
//                               <div>
//                                 <span className="font-medium">{item.sku}</span>
//                                 <span className="text-gray-600 dark:text-gray-400 ml-2">
//                                   Qty: {item.quantity}
//                                 </span>
//                               </div>
//                               <div className="flex items-center space-x-1">
//                                 <button
//                                   onClick={() =>
//                                     updateItemQuantityInPackage(
//                                       shipments[0].id,
//                                       pkg.id,
//                                       item.itemId,
//                                       item.quantity - 1
//                                     )
//                                   }
//                                   className="w-5 h-5 border rounded flex items-center justify-center hover:bg-background"
//                                 >
//                                   <Minus className="w-3 h-3" />
//                                 </button>
//                                 <input
//                                   type="number"
//                                   min="1"
//                                   value={item.quantity}
//                                   onChange={(e) => {
//                                     const value = parseInt(e.target.value) || 1;
//                                     updateItemQuantityInPackage(
//                                       shipments[0].id,
//                                       pkg.id,
//                                       item.itemId,
//                                       value
//                                     );
//                                   }}
//                                   className="w-12 text-center px-1 py-0.5 border rounded text-xs"
//                                 />
//                                 <button
//                                   onClick={() =>
//                                     updateItemQuantityInPackage(
//                                       shipments[0].id,
//                                       pkg.id,
//                                       item.itemId,
//                                       item.quantity + 1
//                                     )
//                                   }
//                                   className="cursor-pointer w-5 h-5 border rounded flex items-center justify-center hover:bg-background"
//                                 >
//                                   <Plus className="w-3 h-3" />
//                                 </button>
//                                 <button
//                                   onClick={() =>
//                                     removeItemFromPackage(
//                                       shipments[0].id,
//                                       pkg.id,
//                                       item.itemId
//                                     )
//                                   }
//                                   className="ml-2 text-red-600 hover:text-red-800"
//                                 >
//                                   <X className="w-3 h-3" />
//                                 </button>
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       )}
//                     </div>

//                     <div className="space-y-3 pt-3 border-t">
//                       <h5 className="text-xs font-medium text-gray-700 dark:text-gray-400">
//                         Package Details
//                       </h5>

//                       <div className="grid grid-cols-2 gap-2">
//                         <select
//                           value={pkg.packageCode}
//                           onChange={(e) =>
//                             updatePackageConfig(
//                               shipments[0].id,
//                               pkg.id,
//                               "packageCode",
//                               e.target.value
//                             )
//                           }
//                           className="border rounded px-2 py-1 text-xs"
//                         >
//                           <option value="">Package Type</option>
//                           {getCarrierOptions(
//                             shipments[0].carrierId
//                           ).packages.map((option) => (
//                             <option
//                               key={option.package_code}
//                               value={option.package_code}
//                             >
//                               {option.name}
//                             </option>
//                           ))}
//                         </select>

//                         <input
//                           type="number"
//                           step="0.1"
//                           placeholder="Weight (lbs)"
//                           value={pkg.weight}
//                           onChange={(e) =>
//                             updatePackageConfig(
//                               shipments[0].id,
//                               pkg.id,
//                               "weight",
//                               e.target.value
//                             )
//                           }
//                           className="border rounded px-2 py-1 text-xs"
//                         />
//                       </div>

//                       <div className="grid grid-cols-3 gap-2">
//                         <input
//                           type="number"
//                           placeholder="L"
//                           value={pkg.dimensions.length}
//                           onChange={(e) =>
//                             updatePackageConfig(
//                               shipments[0].id,
//                               pkg.id,
//                               "dimensions.length",
//                               e.target.value
//                             )
//                           }
//                           className="border rounded px-2 py-1 text-xs"
//                         />
//                         <input
//                           type="number"
//                           placeholder="W"
//                           value={pkg.dimensions.width}
//                           onChange={(e) =>
//                             updatePackageConfig(
//                               shipments[0].id,
//                               pkg.id,
//                               "dimensions.width",
//                               e.target.value
//                             )
//                           }
//                           className="border rounded px-2 py-1 text-xs"
//                         />
//                         <input
//                           type="number"
//                           placeholder="H"
//                           value={pkg.dimensions.height}
//                           onChange={(e) =>
//                             updatePackageConfig(
//                               shipments[0].id,
//                               pkg.id,
//                               "dimensions.height",
//                               e.target.value
//                             )
//                           }
//                           className="border rounded px-2 py-1 text-xs"
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}

//         {!splitMode && !packageMode && shipments.length === 1 && (
//           <div className="space-y-4">
//             {shipments.map((shipment) => (
//               <div key={shipment.id} className="space-y-4">
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="text-sm font-medium block mb-2">
//                       Carrier
//                     </label>
//                     <select
//                       value={shipment.carrierId}
//                       onChange={(e) =>
//                         updateShippingConfig(
//                           shipment.id,
//                           "carrierId",
//                           e.target.value
//                         )
//                       }
//                       disabled={carriersLoading}
//                       className="w-full px-3 py-2 border rounded"
//                     >
//                       <option value="">
//                         {carriersLoading ? "Loading..." : "Select Carrier"}
//                       </option>
//                       {carriers.map((carrier) => (
//                         <option
//                           key={carrier.carrier_id}
//                           value={carrier.carrier_id}
//                         >
//                           {carrier.friendly_name}
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   {shipment.carrierId && (
//                     <div>
//                       <label className="text-sm font-medium block mb-2">
//                         Service
//                       </label>
//                       <select
//                         value={shipment.serviceCode}
//                         onChange={(e) =>
//                           updateShippingConfig(
//                             shipment.id,
//                             "serviceCode",
//                             e.target.value
//                           )
//                         }
//                         className="w-full px-3 py-2 border rounded"
//                       >
//                         <option value="">Select Service</option>
//                         {getCarrierOptions(shipment.carrierId).services.map(
//                           (service) => (
//                             <option
//                               key={service.service_code}
//                               value={service.service_code}
//                             >
//                               {service.name}
//                             </option>
//                           )
//                         )}
//                       </select>
//                     </div>
//                   )}
//                 </div>

//                 {/* ✅ Package Details Section - Works for ALL carriers */}
//                 {shipment.carrierId && (
//                   <div>
//                     <div className="flex items-center justify-between mb-3">
//                       <label className="text-sm font-medium">
//                         Package Details
//                       </label>
//                       <div className="flex items-center gap-2">
//                         <div className="flex items-center gap-2">
//                           <input
//                             type="number"
//                             min="1"
//                             max="20"
//                             value={numberOfPackages}
//                             onChange={(e) =>
//                               setNumberOfPackages(e.target.value)
//                             }
//                             placeholder="# of packages"
//                             className="w-32 px-2 py-1 text-sm border rounded"
//                           />
//                           <button
//                             onClick={() => {
//                               const count = parseInt(numberOfPackages);
//                               if (count > 0 && count <= 20) {
//                                 addMultiplePackagesWithWeightDistribution(
//                                   shipment.id,
//                                   count
//                                 );
//                               }
//                             }}
//                             disabled={
//                               !numberOfPackages ||
//                               parseInt(numberOfPackages) <= 0
//                             }
//                             className="cursor-pointer px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                           >
//                             Add {numberOfPackages || "X"}
//                           </button>
//                         </div>

//                         {shipment.packages.length < 20 && (
//                           <button
//                             onClick={() => addPackageToShipment(shipment.id)}
//                             className="cursor-pointer px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
//                           >
//                             <Plus className="w-4 h-4 mr-1" />
//                             Add Package
//                           </button>
//                         )}
//                       </div>
//                     </div>

//                     {/* Package List */}
//                     {shipment.packages.map((pkg, pkgIndex) => (
//                       <div
//                         key={pkg.id}
//                         className="border p-4 rounded bg-gray-50 dark:bg-zinc-800 space-y-3 mb-3"
//                       >
//                         <div className="flex items-center justify-between">
//                           <span className="text-md font-medium text-emerald-500">
//                             Package {pkgIndex + 1}
//                           </span>
//                           {shipment.packages.length > 1 && (
//                             <button
//                               onClick={() =>
//                                 removePackageFromShipment(shipment.id, pkg.id)
//                               }
//                               className="text-red-600 hover:text-red-800 cursor-pointer"
//                             >
//                               <X className="w-5 h-5" />
//                             </button>
//                           )}
//                         </div>

//                         <div className="grid grid-cols-2 gap-3">
//                           <div>
//                             <label className="text-xs font-medium block mb-1">
//                               Package Type
//                             </label>
//                             <select
//                               value={pkg.packageCode}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "packageCode",
//                                   e.target.value
//                                 )
//                               }
//                               className="w-full px-3 py-2 border rounded text-sm"
//                             >
//                               <option value="">Select Type</option>
//                               {getCarrierOptions(
//                                 shipment.carrierId
//                               ).packages.map((option) => (
//                                 <option
//                                   key={option.package_code}
//                                   value={option.package_code}
//                                 >
//                                   {option.name}
//                                 </option>
//                               ))}
//                             </select>
//                           </div>

//                           <div>
//                             <label className="text-xs font-medium block mb-1">
//                               Weight (lbs)
//                             </label>
//                             <input
//                               type="number"
//                               step="0.1"
//                               placeholder="0.0"
//                               value={pkg.weight}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "weight",
//                                   e.target.value
//                                 )
//                               }
//                               className="w-full px-3 py-2 border rounded text-sm"
//                             />
//                           </div>
//                         </div>

//                         <div>
//                           <label className="text-xs font-medium block mb-1">
//                             Dimensions (inches)
//                           </label>
//                           <div className="grid grid-cols-3 gap-2">
//                             <input
//                               type="number"
//                               placeholder="Length"
//                               value={pkg.dimensions.length}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "dimensions.length",
//                                   e.target.value
//                                 )
//                               }
//                               className="px-3 py-2 border rounded text-sm"
//                             />
//                             <input
//                               type="number"
//                               placeholder="Width"
//                               value={pkg.dimensions.width}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "dimensions.width",
//                                   e.target.value
//                                 )
//                               }
//                               className="px-3 py-2 border rounded text-sm"
//                             />
//                             <input
//                               type="number"
//                               placeholder="Height"
//                               value={pkg.dimensions.height}
//                               onChange={(e) =>
//                                 updatePackageConfig(
//                                   shipment.id,
//                                   pkg.id,
//                                   "dimensions.height",
//                                   e.target.value
//                                 )
//                               }
//                               className="px-3 py-2 border rounded text-sm"
//                             />
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}

//         <div className="flex gap-3 justify-end pt-4 border-t">
//           {onCancel && (
//             <button
//               onClick={onCancel}
//               className="cursor-pointer px-6 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
//               disabled={processing}
//             >
//               Cancel
//             </button>
//           )}
//           <button
//             onClick={processShipments}
//             disabled={
//               processing ||
//               (packageMode
//                 ? shipments[0]?.packages.every((p) => p.items.length === 0)
//                 : shipments.every((s) => s.items.length === 0))
//             }
//             className="cursor-pointer px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
//           >
//             {processing ? (
//               <>
//                 <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                 Creating Labels...
//               </>
//             ) : (
//               <>
//                 <Truck className="w-5 h-5 mr-2" />
//                 Create{" "}
//                 {packageMode
//                   ? `Label (${shipments[0]?.packages.length || 0} packages)`
//                   : shipments.filter((s) => s.items.length > 0).length > 1
//                   ? `${
//                       shipments.filter((s) => s.items.length > 0).length
//                     } Labels`
//                   : "Label"}
//               </>
//             )}
//           </button>
//         </div>
//       </div>

//       {selectedItemForSplit && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
//             <h3 className="text-lg font-semibold mb-4">
//               {packageMode ? "Add Item to Package" : "Split Item"}
//             </h3>

//             {(() => {
//               const item = order.items.find(
//                 (i) => i.id === selectedItemForSplit.itemId
//               );
//               return item ? (
//                 <div className="mb-4">
//                   <p className="font-medium">{item.productName}</p>
//                   <p className="text-sm text-gray-600 dark:text-gray-400">
//                     SKU: {item.sku}
//                   </p>
//                   <p className="text-sm text-gray-600 dark:text-gray-400">
//                     Available: {selectedItemForSplit.availableQty} units
//                   </p>
//                 </div>
//               ) : null;
//             })()}

//             <div className="mb-4">
//               <label className="block text-sm font-medium mb-2">
//                 Quantity to add:
//               </label>
//               <div className="flex items-center space-x-2">
//                 <button
//                   onClick={() =>
//                     setSplitQuantity(Math.max(1, splitQuantity - 1))
//                   }
//                   className="cursor-pointer w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
//                 >
//                   <Minus className="w-4 h-4" />
//                 </button>
//                 <input
//                   type="number"
//                   min="1"
//                   max={selectedItemForSplit.availableQty}
//                   value={splitQuantity}
//                   onChange={(e) => {
//                     const value = parseInt(e.target.value) || 1;
//                     setSplitQuantity(
//                       Math.min(
//                         selectedItemForSplit.availableQty,
//                         Math.max(1, value)
//                       )
//                     );
//                   }}
//                   className="flex-1 text-center px-3 py-2 border rounded"
//                 />
//                 <button
//                   onClick={() =>
//                     setSplitQuantity(
//                       Math.min(
//                         selectedItemForSplit.availableQty,
//                         splitQuantity + 1
//                       )
//                     )
//                   }
//                   className="cursor-pointer w-8 h-8 border rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
//                 >
//                   <Plus className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>

//             <div className="mb-4">
//               <label className="block text-sm font-medium mb-2">
//                 {packageMode ? "Add to package:" : "Add to shipment:"}
//               </label>
//               <select
//                 className="w-full px-3 py-2 border rounded"
//                 onChange={(e) => {
//                   if (e.target.value) {
//                     if (packageMode) {
//                       const [shipmentId, packageId] = e.target.value.split("|");
//                       addItemToPackage(
//                         shipmentId,
//                         packageId,
//                         selectedItemForSplit.itemId,
//                         splitQuantity
//                       );
//                     } else {
//                       addItemToShipment(
//                         e.target.value,
//                         selectedItemForSplit.itemId,
//                         splitQuantity
//                       );
//                     }
//                   }
//                 }}
//                 defaultValue=""
//               >
//                 <option value="">
//                   {packageMode ? "Select package..." : "Select shipment..."}
//                 </option>
//                 {packageMode
//                   ? shipments[0]?.packages.map((pkg, idx) => (
//                       <option
//                         key={pkg.id}
//                         value={`${shipments[0].id}|${pkg.id}`}
//                       >
//                         Package {idx + 1} ({pkg.items.length} items)
//                       </option>
//                     ))
//                   : shipments.map((shipment) => (
//                       <option key={shipment.id} value={shipment.id}>
//                         {shipment.name} ({shipment.items.length} items)
//                       </option>
//                     ))}
//               </select>
//             </div>

//             <div className="flex justify-end space-x-3">
//               <button
//                 onClick={() => {
//                   setSelectedItemForSplit(null);
//                   setSplitQuantity(1);
//                 }}
//                 className="cursor-pointer px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
