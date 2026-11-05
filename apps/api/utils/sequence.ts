import mongoose from "mongoose";
import Counter from "../models/counterModel.js";

const increment = (name: string) =>
  Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { returnDocument: "after" });

/**
 * Next value of a named sequence. Atomic, so concurrent requests never get the
 * same number. The first call seeds the counter from `currentMax()` so it
 * continues after existing records.
 */
async function nextSequence(name: string, currentMax: () => Promise<number>) {
  let counter = await increment(name);
  if (!counter) {
    try {
      await Counter.create({ _id: name, seq: await currentMax() });
    } catch (error) {
      // Another request seeded it first; that's fine
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    counter = await increment(name);
  }
  return counter!.seq;
}

/**
 * Next purchase order number, e.g. "PO-000042". Counting documents (the old
 * approach) reused numbers after a delete and collided under concurrency.
 */
export async function nextPurchaseNumber(): Promise<string> {
  const seq = await nextSequence("purchaseNumber", async () => {
    // Numbers are zero-padded, so the highest one sorts last
    const latest = await mongoose
      .model("Purchase")
      .findOne({ purchaseNumber: /^PO-\d+$/ })
      .sort({ purchaseNumber: -1 })
      .select("purchaseNumber")
      .lean<{ purchaseNumber?: string }>();
    return Number(latest?.purchaseNumber?.slice(3)) || 0;
  });
  return `PO-${String(seq).padStart(6, "0")}`;
}
