import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const SEED_DIR = path.join(process.cwd(), "data", "seed");

// Exclude user-related and transient collections from the export
const EXCLUDE_COLLECTIONS = [
  "users",
  "system.indexes",
  "apilogs",
  "carts",
  "wishlists",
  "notifications",
  "sessions",
  "orders",
  "payments"
];

async function exportSeedData() {
  try {
    console.log("Connecting to Database for Exporting...");
    if (!process.env.MONGO_URI) {
      console.error("ERROR: MONGO_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB.");

    if (!fs.existsSync(SEED_DIR)) {
      fs.mkdirSync(SEED_DIR, { recursive: true });
    }

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not resolved.");

    // Fetch all collections in the database
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections.`);

    let exportedCount = 0;

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;

      if (EXCLUDE_COLLECTIONS.includes(collectionName)) {
        console.log(`Skipping collection: ${collectionName}`);
        continue;
      }

      console.log(`Exporting collection: ${collectionName}...`);

      const documents = await db.collection(collectionName).find({}).toArray();

      if (documents.length > 0) {
        const filePath = path.join(SEED_DIR, `${collectionName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), "utf-8");
        console.log(`Successfully exported ${documents.length} records from ${collectionName}`);
        exportedCount++;
      } else {
        console.log(`Collection ${collectionName} is empty, skipping.`);
      }
    }

    console.log(`Database exported successfully! Extracted data from ${exportedCount} collections into ${SEED_DIR}`);
    process.exit(0);
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }
}

exportSeedData();
