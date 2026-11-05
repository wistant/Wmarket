import mongoose, { Document } from "mongoose";

export interface IVendorDocument extends Document {
  userId: mongoose.Types.ObjectId;
  storeName: string;
  registrationNumber: string;
  description: string;
  logo?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  contactEmail: string;
  contactPhone?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new mongoose.Schema<IVendorDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    storeName: {
      type: String,
      required: true,
      unique: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    contactPhone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
  },
  {
    timestamps: true,
  }
);

const Vendor = mongoose.model<IVendorDocument>("Vendor", vendorSchema);

export default Vendor;
