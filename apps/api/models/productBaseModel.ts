import mongoose, { Document } from "mongoose";

export interface IProductBaseDocument extends Document {
  title: string;
  slug: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const productBaseSchema = new mongoose.Schema<IProductBaseDocument>(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

const ProductBase = mongoose.model<IProductBaseDocument>(
  "ProductBase",
  productBaseSchema
);

export default ProductBase;
