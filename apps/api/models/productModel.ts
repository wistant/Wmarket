import mongoose, { Document, Model } from "mongoose";
import { IProduct } from "../types/index.js";

interface IReviewReply {
  userId: mongoose.Types.ObjectId;
  userName: string;
  comment: string;
  createdAt: Date;
}

interface IReview {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt?: Date;
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  replies: IReviewReply[];
}

interface IRating {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  createdAt?: Date;
}

interface IProductView {
  userId?: mongoose.Types.ObjectId;
  viewedAt: Date;
}

export interface IProductDocument
  extends Omit<IProduct, "_id" | "category" | "brand" | "badge" | "productBase">,
    Document {
  slug: string;
  purchasePrice: number;
  profitMargin: number;
  discountPercentage: number;
  ratings: mongoose.Types.DocumentArray<IRating>;
  averageRating: number;
  numReviews: number;
  reviews: mongoose.Types.DocumentArray<IReview>;
  viewCount: number;
  views: IProductView[];
  image: string;
  bg?: string;
  images: string[];
  productBase?: mongoose.Types.ObjectId;
  vendor?: mongoose.Types.ObjectId;
  productTypes?: any[]; // To allow populate
  approvalStatus: "pending" | "approved" | "rejected";
  sizes?: mongoose.Types.ObjectId[];
  colors?: mongoose.Types.ObjectId[];
  weights?: mongoose.Types.ObjectId[];
  categories?: any; // To allow populate
  brands?: any; // To allow populate
  category: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  badge?: mongoose.Types.ObjectId;
  isNewItem: boolean;
}

const productSchema = new mongoose.Schema<IProductDocument>(
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
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    profitMargin: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // Percentage
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    isNewItem: {
      type: Boolean,
      default: false,
    },
    ratings: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          required: true,
        },
        isApproved: {
          type: Boolean,
          default: true,
        },
        likes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        dislikes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        replies: [
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            userName: {
              type: String,
              required: true,
            },
            comment: {
              type: String,
              required: true,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
    views: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    image: {
      type: String,
      required: true,
    },
    bg: {
      type: String,
      default: "#F4F3F5",
    },
    images: {
      type: [String],
      default: function (this: IProductDocument) {
        // Auto-populate images array with existing image for backward compatibility
        return this.image ? [this.image] : [];
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Brand",
    },
    productBase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductBase",
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    productTypes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductType",
      },
    ],
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // Default to approved for admin created products, controller handles vendor logic
    },
    sizes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Size",
      },
    ],
    colors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Color",
      },
    ],
    weights: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Weight",
      },
    ],
    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
    },
  },
  {
    timestamps: true,
  }
);

// --- Performance Indexes ---
// Filter by productTypes (most frequent home page query pattern)
productSchema.index({ productTypes: 1, createdAt: -1 });
// Approval status + date (used in every public listing query)
productSchema.index({ approvalStatus: 1, createdAt: -1 });
// Category-based listing
productSchema.index({ category: 1, createdAt: -1 });
// Price range filtering
productSchema.index({ price: 1 });
// Full text search
productSchema.index({ name: "text" });

// Generate slug from product details before save
productSchema.pre("save", async function (this: IProductDocument) {
  if (!this.slug || this.isModified("name")) {
    const slugParts = [];

    // Add product name
    const nameSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    slugParts.push(nameSlug);

    // Populate category and brand if they are ObjectIds
    if (this.isModified("category") && this.category) {
      await this.populate("category");
    }
    if (this.isModified("brand") && this.brand) {
      await this.populate("brand");
    }

    // Add category if available
    // Cast to any because populate might have replaced ObjectId with object
    const category = this.category as any;
    if (category && category.name) {
      const categorySlug = category.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      slugParts.push(categorySlug);
    }

    // Create base slug
    let baseSlug = slugParts.join("-");
    let finalSlug = baseSlug;
    let counter = 1;

    // Check for unique slug
    while (
      await mongoose
        .model("Product")
        .findOne({ slug: finalSlug, _id: { $ne: this._id } })
    ) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = finalSlug;
  }
});

// Ensure images array and image field stay in sync
productSchema.pre("save", async function (this: IProductDocument) {
  // If images array exists and has items, set image to first item
  if (this.images && this.images.length > 0) {
    this.image = this.images[0];
  }
  // If image exists but images is empty, populate images with image
  else if (this.image && (!this.images || this.images.length === 0)) {
    this.images = [this.image];
  }
});

// Calculate average rating and review count before saving
productSchema.pre("save", async function (this: IProductDocument) {
  // Calculate from approved reviews
  const approvedReviews = this.reviews.filter((review) => review.isApproved);
  if (approvedReviews.length > 0) {
    const sum = approvedReviews.reduce((acc, item) => acc + item.rating, 0);
    this.averageRating = sum / approvedReviews.length;
    this.numReviews = approvedReviews.length;
  } else {
    this.averageRating = 0;
    this.numReviews = 0;
  }
});

const Product = mongoose.model<IProductDocument>("Product", productSchema);

export default Product;
