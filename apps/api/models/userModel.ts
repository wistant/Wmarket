import mongoose, { Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser } from "../types/index.js";

interface IAddress {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress?: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
  apartment?: string;
  deliveryTime?: string;
  shipmentType?: string;
  addressType?: string;
  isDefault: boolean;
}

export interface IUserDocument extends Omit<IUser, "_id">, Document {
  isOAuthUser: boolean;
  authProvider: string;
  authUid?: string;
  hasSetPassword: boolean;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  resetPasswordAttempts?: number;
  addresses: mongoose.Types.DocumentArray<IAddress & Document>;
  wishlist: mongoose.Types.ObjectId[];
  cart: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    colorId?: mongoose.Types.ObjectId;
    sizeId?: mongoose.Types.ObjectId;
  }[];
  orders: mongoose.Types.ObjectId[];
  password?: string;
  employee_role?: string | null;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function (this: IUserDocument) {
        // Password is only required for non-OAuth users
        return !this.isOAuthUser;
      },
    },
    avatar: {
      type: String,
      default:
        process.env.DEFAULT_USER_IMAGE ||
        "https://res.cloudinary.com/dcs9nphcp/image/upload/v1759859570/defaultUserImage_dzrcwx.png",
    },
    role: {
      type: String,
      enum: ["admin", "user", "employee", "vendor", "preview"],
      default: "user",
    },
    // Employee specific role (only applicable when role is 'employee')
    employee_role: {
      type: String,
      enum: ["packer", "deliveryman", "accounts", "incharge", "call_center"],
      validate: {
        validator: function (this: IUserDocument, value: string) {
          // employee_role is required when role is 'employee'
          if (this.role === "employee" && !value) {
            return false;
          }
          // employee_role should be null when role is not 'employee'
          if (this.role !== "employee" && value) {
            return false;
          }
          return true;
        },
        message:
          "Employee role is required for employees and should be null for non-employees",
      },
    },
    // OAuth specific fields
    isOAuthUser: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github", "facebook"],
      default: "local",
    },
    authUid: {
      type: String,
      default: null,
    },
    // Optional: Track if user has set a password after OAuth registration
    hasSetPassword: {
      type: Boolean,
      default: function (this: IUserDocument) {
        return !this.isOAuthUser;
      },
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
    resetPasswordAttempts: {
      type: Number,
      default: 0,
    },
    addresses: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        emailAddress: { type: String },
        country: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        apartment: { type: String },
        deliveryTime: { type: String },
        shipmentType: { type: String },
        addressType: { type: String },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    cart: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        colorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Color",
        },
        sizeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Size",
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  // If user has no password set (OAuth user without password), return false
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password as string);
};

// Combined pre-save hook for password hashing and address validation
userSchema.pre("save", async function (this: IUserDocument) {
  // eslint-disable-next-line no-useless-catch
  try {
    // Handle password hashing
    if (this.isModified("password") && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);

      // If password is being set, mark hasSetPassword as true
      if (this.isOAuthUser) {
        this.hasSetPassword = true;
      }
    }

    // Ensure only one address is default
    if (this.isModified("addresses") && this.addresses.length > 0) {
      const defaultAddress = this.addresses.find((addr) => addr.isDefault);
      if (defaultAddress) {
        this.addresses.forEach((addr) => {
          if (addr !== defaultAddress) addr.isDefault = false;
        });
      }
    }
  } catch (error) {
    throw error;
  }
});

const User = mongoose.model<IUserDocument>("User", userSchema);

export default User;
