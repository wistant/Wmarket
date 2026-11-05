import mongoose, { Document, Model } from "mongoose";

export interface ICategoryDocument extends Document {
  name: string;
  slug: string;
  image?: string;
  icon?: string;
  parent: mongoose.Types.ObjectId | null;
  path: string;
  level: number;
  order: number;
  isActive: boolean;
  isFavorite: boolean;
  productBases?: mongoose.Types.ObjectId[];
  description: string;
  children?: ICategoryDocument[]; // Virtual
  wasNew?: boolean; // Internal mongoose property
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getAncestors(): Promise<ICategoryDocument[]>;
  getDescendants(): Promise<ICategoryDocument[]>;
  hasChildren(): Promise<boolean>;
}

interface ICategoryModel extends Model<ICategoryDocument> {
  getTree(parentId?: mongoose.Types.ObjectId | null): Promise<any[]>;
}

const categorySchema = new mongoose.Schema<ICategoryDocument, ICategoryModel>(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true, // Allows unique constraint to work with auto-generation
    },
    image: {
      type: String,
      required: false, // Image is optional
    },
    icon: {
      type: String,
      required: false, // Icon is optional (can be SVG string or image URL)
    },
    // Parent category reference (null for root categories)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    // Materialized path for efficient hierarchy queries (e.g., "parentId,childId,grandchildId")
    path: {
      type: String,
      default: "",
    },
    // Level in hierarchy (0 for root, 1 for first level children, etc.)
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Order for sorting categories at the same level
    order: {
      type: Number,
      default: 0,
    },
    // Whether this category is active
    isActive: {
      type: Boolean,
      default: true,
    },
    // Whether this category is pinned as a favorite
    isFavorite: {
      type: Boolean,
      default: false,
    },
    // Description for SEO
    description: {
      type: String,
      default: "",
    },
    productBases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductBase",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field to get children categories
categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

// Index for efficient queries
// Note: slug already has unique index from schema definition
categorySchema.index({ parent: 1, order: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ isActive: 1 });

// Generate slug from name before saving
categorySchema.pre("save", async function () {
  if (this.isModified("name") || this.isNew) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Ensure slug uniqueness
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists (excluding current document for updates)
    while (true) {
      // Use this.constructor which is the Model
      const existingCategory = await (
        this.constructor as ICategoryModel
      ).findOne({
        slug: slug,
        _id: { $ne: this._id },
      });

      if (!existingCategory) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
});

// Update path and level before saving
categorySchema.pre("save", async function () {
  if (this.isModified("parent") || this.isNew) {
    if (this.parent) {
      try {
        const parentCategory = await (
          this.constructor as ICategoryModel
        ).findById(this.parent);
        if (parentCategory) {
          this.path = parentCategory.path
            ? `${parentCategory.path},${this.parent}`
            : `${this.parent}`;
          this.level = parentCategory.level + 1;
        } else {
          // Parent not found, treat as root
          this.parent = null;
          this.path = "";
          this.level = 0;
        }
      } catch (error) {
        console.error("Error finding parent category:", error);
        this.parent = null;
        this.path = "";
        this.level = 0;
      }
    } else {
      // Root category
      this.path = "";
      this.level = 0;
    }
  }
});

// Update all children paths when category is moved
categorySchema.post("save", async function (doc: ICategoryDocument) {
  // Check if doc was new (using createdAt comparison as proxy)
  if (
    doc.createdAt &&
    doc.updatedAt &&
    doc.createdAt.getTime() === doc.updatedAt.getTime()
  ) {
    return;
  }

  try {
    // Find all children of this category
    const children = await (doc.constructor as ICategoryModel).find({
      parent: doc._id,
    });

    // Update each child's path
    for (const child of children) {
      child.path = doc.path ? `${doc.path},${doc._id}` : `${doc._id}`;
      child.level = doc.level + 1;
      await child.save();
    }
  } catch (error) {
    console.error("Error updating children paths:", error);
  }
});

// Method to get all ancestor categories
categorySchema.methods.getAncestors = async function () {
  if (!this.path) return [];

  const ancestorIds = this.path.split(",").filter(Boolean);
  return await (this.constructor as ICategoryModel)
    .find({ _id: { $in: ancestorIds } })
    .sort({ level: 1 });
};

// Method to get all descendant categories
categorySchema.methods.getDescendants = async function () {
  const regex = new RegExp(`^${this._id}(,|$)`);
  return await (this.constructor as ICategoryModel)
    .find({
      path: regex,
    })
    .sort({ level: 1, order: 1 });
};

// Method to check if category has children
categorySchema.methods.hasChildren = async function () {
  const count = await (this.constructor as ICategoryModel).countDocuments({
    parent: this._id,
  });
  return count > 0;
};

// Static method to get category tree
categorySchema.statics.getTree = async function (
  parentId: mongoose.Types.ObjectId | null = null
) {
  const categories = await this.find({ parent: parentId, isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();

  // Need to cast to any to add children property as it is virtual/not in DB schema for lean() result
  const result: any[] = categories;

  for (const category of result) {
    category.children = await this.getTree(category._id);
  }

  return result;
};

// Prevent deletion if category has children
categorySchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    // In deleteOne document=true middleware, 'this' is the document
    const doc = this as unknown as ICategoryDocument;
    const hasChildren = await doc.hasChildren();
    if (hasChildren) {
      throw new Error(
        "Cannot delete category with subcategories. Please delete or reassign subcategories first."
      );
    }
  }
);

const Category = mongoose.model<ICategoryDocument, ICategoryModel>(
  "Category",
  categorySchema
);

export default Category;
