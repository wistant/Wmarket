export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "employee" | "vendor";
  avatar?: string;
  createdAt: string;
}

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  purchasedQuantity: number;
  category: string;
  brand: string;
  images: string[];
  featured: boolean;
  sizes?: string[]; // Array of Size IDs
  colors?: string[]; // Array of Color IDs
  weights?: string[]; // Array of Weight IDs
  productBase?: string; // ID of ProductBase
  productTypes?: string[]; // Array of Product Type IDs
  badge?: string; // Badge ID
  createdAt: string;
}

export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  vendor?: string;
  commissionRate?: number;
}

export interface IOrder {
  _id: string;
  user: IUser | string;
  items: IOrderItem[];
  total: number;
  status: "pending" | "processing" | "address_confirmed" | "confirmed" | "packed" | "delivering" | "delivered" | "completed" | "cancelled";
  shippingAddress: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    emailAddress?: string;
    street: string;
    country: string;
    city: string;
    state: string;
    zipCode?: string;
    postalCode?: string;
    apartment?: string;
    deliveryTime?: string;
    shipmentType?: string;
    addressType?: string;
  };
  paymentMethod: string;
  isPaid: boolean;
  isDelivered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IUploadResult {
  success: boolean;
  provider: "cloudinary" | "s3" | "imagekit";
  url?: string;
  publicId?: string;
  fileId?: string;
  key?: string;
  originalName?: string;
  size?: number;
  format?: string;
  bucket?: string;
  error?: string;
  message?: string;
}

export interface IUploadOptions {
  folder?: string;
  provider?: "cloudinary" | "s3" | "imagekit";
  transformation?: any[];
  originalName?: string;
  contentType?: string;
  enableFallback?: boolean;
}
