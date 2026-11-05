import mongoose, { Document } from "mongoose";

export interface IBannerPageDocument extends Document {
  name: string;
  title: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bannerPageSchema = new mongoose.Schema<IBannerPageDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const BannerPage = mongoose.model<IBannerPageDocument>(
  "BannerPage",
  bannerPageSchema,
);

export default BannerPage;
