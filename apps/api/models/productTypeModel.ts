import mongoose, { Document } from "mongoose";

export interface IProductTypeDocument extends Document {
  name: string;
  slug: string;
  title?: string;
  description?: string;
  banner?: string;
  bannerImages: string[];
  isActive: boolean;
  displayOrder: number;
  bgColor?: string;
  productBasesBg?: Map<string, string>;
  bannerPages?: mongoose.Types.ObjectId[];
  productBases?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const productTypesSchema = new mongoose.Schema<IProductTypeDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    banner: {
      type: String,
      default: "",
    },
    bannerImages: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    bgColor: {
      type: String,
      default: "#ffffff",
    },
    productBasesBg: {
      type: Map,
      of: String,
      default: {},
    },
    bannerPages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BannerPage",
      },
    ],
    productBases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductBase",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Additional query indexes (name & slug already indexed via unique:true on the fields)
// Only index fields used for filtering/sorting that don't already have an index
productTypesSchema.index({ isActive: 1 });
productTypesSchema.index({ displayOrder: 1 });

const ProductType = mongoose.model<IProductTypeDocument>(
  "ProductType",
  productTypesSchema
);

export default ProductType;
