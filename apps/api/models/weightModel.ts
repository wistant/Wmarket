import mongoose, { Document } from "mongoose";

export interface IWeightDocument extends Document {
  name: string;
  value: string;
  slug: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const weightSchema = new mongoose.Schema<IWeightDocument>(
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

weightSchema.pre("save", async function (this: IWeightDocument) {
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
        .model("Weight")
        .findOne({ slug: finalSlug, _id: { $ne: this._id } })
    ) {
      finalSlug = `${this.slug}-${counter}`;
      counter++;
    }
    this.slug = finalSlug;
  }
});

const Weight = mongoose.model<IWeightDocument>("Weight", weightSchema);

export default Weight;
