import mongoose, { Document } from "mongoose";

export interface IColorDocument extends Document {
  name: string;
  value: string;
  slug: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const colorSchema = new mongoose.Schema<IColorDocument>(
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

colorSchema.pre("save", async function (this: IColorDocument) {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Ensure uniqueness
    let finalSlug = this.slug;
    let counter = 1;
    while (
      await mongoose
        .model("Color")
        .findOne({ slug: finalSlug, _id: { $ne: this._id } })
    ) {
      finalSlug = `${this.slug}-${counter}`;
      counter++;
    }
    this.slug = finalSlug;
  }
});

const Color = mongoose.model<IColorDocument>("Color", colorSchema);

export default Color;
