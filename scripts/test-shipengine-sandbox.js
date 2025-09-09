const fetch = require("node-fetch");
require("dotenv").config({ path: ".env" });

async function testShipEngineSandbox() {
  console.log("🧪 Testing ShipEngine Sandbox API...");

  const apiKey = process.env.SHIPENGINE_API_KEY;
  const baseUrl =
    process.env.SHIPENGINE_BASE_URL || "https://api.shipengine.com/v1";
  const isSandbox = process.env.SHIPENGINE_SANDBOX === "true";

  if (!apiKey) {
    console.log("❌ Missing ShipEngine API key");
    console.log("Add to .env.local:");
    console.log('SHIPENGINE_API_KEY="TEST_your-test-api-key"');
    console.log('SHIPENGINE_SANDBOX="true"');
    console.log(
      "\nGet a sandbox API key from: https://www.shipengine.com/signup/"
    );
    return;
  }

  console.log(`🌍 Environment: ${isSandbox ? "SANDBOX" : "PRODUCTION"}`);
  console.log(`🔗 Base URL: ${baseUrl}`);

  try {
    // Test 1: API Connection & Carriers
    console.log("\n📡 Testing API connection...");
    const carriersResponse = await fetch(`${baseUrl}/carriers`, {
      headers: {
        "API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!carriersResponse.ok) {
      const errorText = await carriersResponse.text();
      console.log(
        "❌ API Connection failed:",
        carriersResponse.status,
        errorText
      );
      return;
    }

    const carriersData = await carriersResponse.json();
    console.log("✅ API Connection successful");
    console.log(`📦 Available carriers: ${carriersData.carriers.length}`);

    // Show first few carriers
    carriersData.carriers.slice(0, 5).forEach((carrier) => {
      console.log(`   - ${carrier.friendly_name} (${carrier.carrier_code})`);
    });

    // Test 2: Get services for USPS (most common)
    const uspsCarrier = carriersData.carriers.find(
      (c) => c.carrier_code === "stamps_com"
    );
    if (uspsCarrier) {
      console.log("\n📮 Getting USPS services...");
      const servicesResponse = await fetch(
        `${baseUrl}/carriers/${uspsCarrier.carrier_id}/services`,
        {
          headers: {
            "API-Key": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        console.log(`✅ Found ${servicesData.services.length} USPS services`);
        servicesData.services.slice(0, 3).forEach((service) => {
          console.log(`   - ${service.name} (${service.service_code})`);
        });
      }
    }

    // Test 3: Address validation
    console.log("\n🏠 Testing address validation...");
    const testAddress = {
      name: "John Doe",
      address_line1: "1600 Amphitheatre Parkway",
      city_locality: "Mountain View",
      state_province: "CA",
      postal_code: "94043",
      country_code: "US",
    };

    const addressResponse = await fetch(`${baseUrl}/addresses/validate`, {
      method: "POST",
      headers: {
        "API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([testAddress]),
    });

    if (addressResponse.ok) {
      const addressData = await addressResponse.json();
      console.log("✅ Address validation successful");
      console.log(`📍 Status: ${addressData[0].status}`);
    }

    // Test 4: Get shipping rates
    console.log("\n💰 Getting shipping rates...");
    const testShipment = {
      ship_to: {
        name: "Jane Doe",
        address_line1: "123 Any Street",
        city_locality: "Austin",
        state_province: "TX",
        postal_code: "78756",
        country_code: "US",
      },
      ship_from: {
        name: "John Doe",
        address_line1: "1600 Amphitheatre Parkway",
        city_locality: "Mountain View",
        state_province: "CA",
        postal_code: "94043",
        country_code: "US",
      },
      packages: [
        {
          weight: {
            value: 1.0,
            unit: "pound",
          },
          dimensions: {
            unit: "inch",
            length: 12,
            width: 8,
            height: 6,
          },
        },
      ],
    };

    const ratesResponse = await fetch(`${baseUrl}/rates`, {
      method: "POST",
      headers: {
        "API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shipment: testShipment }),
    });

    if (ratesResponse.ok) {
      const ratesData = await ratesResponse.json();
      console.log(
        `✅ Found ${ratesData.rate_response.rates.length} shipping rates`
      );
      ratesData.rate_response.rates.slice(0, 3).forEach((rate) => {
        console.log(
          `   - ${rate.service_type}: $${rate.shipping_amount.amount} (${rate.delivery_days} days)`
        );
      });

      // Test 5: Create test label
      if (ratesData.rate_response.rates.length > 0) {
        console.log("\n🏷️  Creating test shipping label...");
        const firstRate = ratesData.rate_response.rates[0];

        const labelResponse = await fetch(`${baseUrl}/labels`, {
          method: "POST",
          headers: {
            "API-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rate_id: firstRate.rate_id,
            test_label: true,
            label_format: "pdf",
            label_layout: "4x6",
          }),
        });

        if (labelResponse.ok) {
          const labelData = await labelResponse.json();
          console.log("✅ Test label created successfully!");
          console.log(`📋 Label ID: ${labelData.label_id}`);
          console.log(`📋 Tracking Number: ${labelData.tracking_number}`);
          console.log(`💰 Cost: $${labelData.shipment_cost.amount}`);
          console.log(`📄 Label URL: ${labelData.label_download.href}`);
          console.log(`⚠️  Note: This is a TEST label - no postage charged`);
        } else {
          const labelError = await labelResponse.json();
          console.log("❌ Label creation failed:", labelError);
        }
      }
    }

    console.log("\n🎉 ShipEngine Sandbox testing complete!");
    console.log("🔗 Next steps:");
    console.log("   1. Integrate with your order fulfillment");
    console.log("   2. Create real labels for orders");
    console.log("   3. Set up tracking webhooks");
    console.log("   4. Test different carriers and services");
  } catch (error) {
    console.error("❌ Error testing ShipEngine:", error.message);
  }
}

testShipEngineSandbox();
