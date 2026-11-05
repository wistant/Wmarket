import mongoose, { Document } from "mongoose";

export interface IBadge {
  name: string;
  slug: string;
  displayOrder?: number;
}

export interface IBadgeDocument extends IBadge, Document {}

const badgeSchema = new mongoose.Schema<IBadgeDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Badge = mongoose.model<IBadgeDocument>("Badge", badgeSchema);

export default Badge;
