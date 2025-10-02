// scripts/migrate-location-barcodes.js

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateLocationBarcodes() {
  try {
    console.log("Starting location barcode migration...");

    // Get all locations
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        barcode: true,
      },
    });

    console.log(`Found ${locations.length} locations to update`);

    let updated = 0;
    let skipped = 0;

    // Update each location
    for (const location of locations) {
      // Only update if barcode is different from name
      if (location.barcode !== location.name) {
        await prisma.location.update({
          where: { id: location.id },
          data: {
            barcode: location.name, // Set barcode to location name
          },
        });
        console.log(
          `✓ Updated ${location.name}: ${location.barcode} → ${location.name}`
        );
        updated++;
      } else {
        skipped++;
      }
    }

    console.log("\n✅ Migration complete!");
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${locations.length}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateLocationBarcodes();
