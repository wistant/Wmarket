import mongoose, { Document } from "mongoose";

export interface ISizeDocument extends Document {
  name: string;
  value: string;
  slug: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const sizeSchema = new mongoose.Schema<ISizeDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
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

sizeSchema.pre("save", async function (this: ISizeDocument) {
  if (this.isModified("value") || !this.slug) {
    this.slug = this.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Ensure uniqueness
    let finalSlug = this.slug;
    let counter = 1;
    while (
      await mongoose
        .model("Size")
        .findOne({ slug: finalSlug, _id: { $ne: this._id } })
    ) {
      finalSlug = `${this.slug}-${counter}`;
      counter++;
    }
    this.slug = finalSlug;
  }
});

const Size = mongoose.model<ISizeDocument>("Size", sizeSchema);

export default Size;
