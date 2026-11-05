import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { revive } from "../utils/seedRevive.js";

dotenv.config();

const SEED_DIR = path.join(process.cwd(), "data", "seed");

async function importSeedData() {
  try {
    console.log("Connecting to Database for Seeding...");
    if (!process.env.MONGO_URI) {
      console.error("ERROR: MONGO_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected.");

    if (!fs.existsSync(SEED_DIR)) {
      console.error("ERROR: Seed directory not found at " + SEED_DIR);
      process.exit(1);
    }

    const files = fs.readdirSync(SEED_DIR).filter(f => f.endsWith(".json"));
    if (files.length === 0) {
      console.log("No seed files found.");
      process.exit(0);
    }

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database not resolved.");

    for (const file of files) {
      const collectionName = file.replace(".json", "");
      console.log(`Importing to collection: ${collectionName}...`);

      const filePath = path.join(SEED_DIR, file);
      const rawData = fs.readFileSync(filePath, "utf-8");
      let data = JSON.parse(rawData);

      // We write with the native driver (no schemas to cast for us), so revive
      // ids and dates ourselves
      data = data.map((doc: any) => revive(doc));

      if (data.length > 0) {
        // Safe upsert logic to ensure no existing records are removed
        const bulkOps = data.map((doc: any) => {
          // Identify unique property (using _id)
          const filter = { _id: doc._id };
          return {
            updateOne: {
              filter,
              update: { $set: doc },
              upsert: true
            }
          };
        });

        const result = await db.collection(collectionName).bulkWrite(bulkOps);
        console.log(`Successfully synced ${data.length} records into ${collectionName}. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`);
      }
    }

    console.log("Database seeded successfully! Your demo store is ready.");
    process.exit(0);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

importSeedData();
