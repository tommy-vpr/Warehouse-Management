interface ShipEngineAddress {
  name: string;
  phone?: string;
  company_name?: string;
  address_line1: string;
  address_line2?: string;
  address_line3?: string;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  address_residential_indicator?: "yes" | "no" | "unknown";
}

interface ShipEnginePackage {
  weight: {
    value: number;
    unit: "pound" | "ounce" | "kilogram" | "gram";
  };
  dimensions?: {
    unit: "inch" | "centimeter";
    length: number;
    width: number;
    height: number;
  };
  package_code?: string;
  insured_value?: {
    currency: string;
    amount: number;
  };
  label_messages?: {
    reference1?: string;
    reference2?: string;
    reference3?: string;
  };
}

interface ShipEngineShipment {
  service_code?: string;
  ship_to: ShipEngineAddress;
  ship_from: ShipEngineAddress;
  packages: ShipEnginePackage[];
  confirmation?: "none" | "delivery" | "signature" | "adult_signature";
  customs?: {
    contents:
      | "merchandise"
      | "documents"
      | "gift"
      | "returned_goods"
      | "sample";
    non_delivery: "return_to_sender" | "treat_as_abandoned";
    customs_items: Array<{
      description: string;
      quantity: number;
      value: {
        currency: string;
        amount: number;
      };
      harmonized_tariff_code?: string;
      country_of_origin?: string;
      unit_of_measure?: string;
      sku?: string;
    }>;
  };
  advanced_options?: {
    bill_to_account?: string;
    bill_to_country_code?: string;
    bill_to_postal_code?: string;
    contains_alcohol?: boolean;
    delivered_duty_paid?: boolean;
    dry_ice?: boolean;
    dry_ice_weight?: {
      value: number;
      unit: string;
    };
    non_machinable?: boolean;
    saturday_delivery?: boolean;
    use_ups_ground_freight_pricing?: boolean;
    freight_class?: string;
    custom_field1?: string;
    custom_field2?: string;
    custom_field3?: string;
  };
}

interface ShipEngineLabel {
  label_id: string;
  status: "completed" | "processing" | "error";
  shipment_id: string;
  ship_date: string;
  created_at: string;
  shipment_cost: {
    currency: string;
    amount: number;
  };
  insurance_cost: {
    currency: string;
    amount: number;
  };
  tracking_number: string;
  is_return_label: boolean;
  rma_number?: string;
  is_international: boolean;
  batch_id?: string;
  carrier_id: string;
  service_code: string;
  package_code: string;
  voided: boolean;
  voided_at?: string;
  label_format: "pdf" | "png" | "zpl";
  label_layout: "4x6" | "8.5x11";
  trackable: boolean;
  label_image_id?: string;
  carrier_code: string;
  tracking_status: "unknown" | "in_transit" | "error" | "delivered";
  label_download: {
    pdf?: string;
    png?: string;
    zpl?: string;
    href: string;
  };
  form_download?: {
    href: string;
  };
  insurance_claim?: {
    href: string;
  };
  packages: Array<{
    package_id: number;
    package_code: string;
    weight: {
      value: number;
      unit: string;
    };
    dimensions?: {
      unit: string;
      length: number;
      width: number;
      height: number;
    };
    insured_value: {
      currency: string;
      amount: number;
    };
    tracking_number: string;
    label_messages: {
      reference1?: string;
      reference2?: string;
      reference3?: string;
    };
    external_package_id?: string;
  }>;
}

class ShipEngineAPI {
  private apiKey: string;
  private baseUrl: string;
  private isSandbox: boolean;

  constructor() {
    this.apiKey = process.env.SHIPENGINE_API_KEY!;
    this.baseUrl =
      process.env.SHIPENGINE_BASE_URL || "https://api.shipengine.com/v1";
    this.isSandbox = process.env.SHIPENGINE_SANDBOX === "true";
  }

  // In your lib/shipengine.ts, update the request method:
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "API-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Log the full error details for debugging
      console.error("ShipEngine API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        url: url,
        errorData: errorData,
        requestBody: options.body, // This will show what we sent
      });

      const error = new Error(
        `ShipEngine API Error: ${response.status} - ${
          errorData.message || response.statusText
        }`
      );

      // Attach the full error data to the error object
      (error as any).response = {
        status: response.status,
        data: errorData,
      };

      throw error;
    }

    return response.json();
  }

  // Test API connection
  async testConnection() {
    try {
      const carriers = await this.request("/carriers");
      return {
        success: true,
        message: "Connection successful",
        carriersCount: carriers.carriers?.length || 0,
        environment: this.isSandbox ? "sandbox" : "production",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
        environment: this.isSandbox ? "sandbox" : "production",
      };
    }
  }

  // Get carriers
  async getCarriers() {
    return this.request("/carriers");
  }

  // Get services for a carrier
  async getServices(carrierId: string) {
    return this.request(`/carriers/${carrierId}/services`);
  }

  // Get shipping rates
  async getRates(shipment: ShipEngineShipment) {
    return this.request("/rates", {
      method: "POST",
      body: JSON.stringify({ shipment }),
    });
  }

  // Create label from shipment
  async createLabelFromShipment(
    shipment: ShipEngineShipment,
    options?: {
      test_label?: boolean;
      label_format?: "pdf" | "png" | "zpl";
      label_layout?: "4x6" | "8.5x11";
      label_download_type?: "url" | "inline";
    }
  ) {
    return this.request("/labels", {
      method: "POST",
      body: JSON.stringify({
        shipment,
        test_label: this.isSandbox || options?.test_label,
        label_format: options?.label_format || "pdf",
        label_layout: options?.label_layout || "4x6",
        label_download_type: options?.label_download_type || "url",
      }),
    });
  }

  // Create label from rate
  async createLabelFromRate(
    rateId: string,
    options?: {
      test_label?: boolean;
      label_format?: "pdf" | "png" | "zpl";
      label_layout?: "4x6" | "8.5x11";
    }
  ) {
    return this.request("/labels", {
      method: "POST",
      body: JSON.stringify({
        rate_id: rateId,
        test_label: this.isSandbox || options?.test_label,
        label_format: options?.label_format || "pdf",
        label_layout: options?.label_layout || "4x6",
      }),
    });
  }

  // Track package
  async trackPackage(carrierCode: string, trackingNumber: string) {
    return this.request(
      `/tracking?carrier_code=${carrierCode}&tracking_number=${trackingNumber}`
    );
  }

  // Validate address
  async validateAddress(address: Partial<ShipEngineAddress>) {
    return this.request("/addresses/validate", {
      method: "POST",
      body: JSON.stringify([address]),
    });
  }

  // Void label
  async voidLabel(labelId: string) {
    return this.request(`/labels/${labelId}/void`, {
      method: "PUT",
    });
  }

  // List packages
  async getPackageTypes() {
    return this.request("/packages");
  }
}

export const shipengine = new ShipEngineAPI();
export type {
  ShipEngineAddress,
  ShipEngineShipment,
  ShipEnginePackage,
  ShipEngineLabel,
};
