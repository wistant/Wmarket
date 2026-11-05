import mongoose, { Document } from "mongoose";

export interface IBrandDocument extends Document {
  name: string;
  slug: string;
  image: string;
  productBase: mongoose.Types.ObjectId;
  isFeatured: boolean;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new mongoose.Schema<IBrandDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    image: {
      type: String,
      default: "",
    },
    productBase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductBase",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

brandSchema.pre("save", async function (this: IBrandDocument) {
  // Auto-generate slug if not provided, or if name is modified and slug is not explicitly modified
  if (!this.slug || (this.isModified("name") && !this.isModified("slug"))) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let finalSlug = baseSlug;
    let counter = 1;

    // Check for uniqueness
    while (
      await mongoose
        .model("Brand")
        .findOne({ slug: finalSlug, _id: { $ne: this._id } })
    ) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = finalSlug;
  }
});

const Brand = mongoose.model<IBrandDocument>("Brand", brandSchema);

export default Brand;
