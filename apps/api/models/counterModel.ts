import mongoose from "mongoose";

/** Named sequences (e.g. purchase numbers), incremented atomically. */
interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new mongoose.Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

const Counter =
  (mongoose.models.Counter as mongoose.Model<ICounter>) ||
  mongoose.model<ICounter>("Counter", counterSchema);

export default Counter;
