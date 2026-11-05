import mongoose from "mongoose";

// The seed files are plain JSON written by exportSeed, so every ObjectId and
// Date in them became a string. Turn them back, at any depth: references like a
// product's category must be real ObjectIds or queries that filter on them find
// nothing, and dates must be real Dates or sorting and date aggregations break.
const OBJECT_ID = /^[a-f0-9]{24}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function revive(value: unknown): unknown {
  if (typeof value === "string") {
    if (OBJECT_ID.test(value)) return new mongoose.Types.ObjectId(value);
    if (ISO_DATE.test(value)) return new Date(value);
    return value;
  }
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, revive(inner)]),
    );
  }
  return value;
}
