import mongoose from "mongoose";

mongoose.set("strictQuery", false);

let connecting: Promise<typeof mongoose> | null = null;

/**
 * Connect once and reuse the connection (important on serverless, where the
 * module stays warm between requests). A failed attempt is logged and cleared
 * so the next request retries, instead of exiting the process.
 */
const connectDB = (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);

  if (!connecting) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return Promise.reject(new Error("MONGODB_URI is not defined in environment variables"));
    }

    connecting = mongoose
      .connect(mongoUri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error: unknown) => {
        connecting = null;
        console.error(
          "MongoDB Connection Error:",
          error instanceof Error ? error.message : error,
        );
        throw error;
      });
  }
  return connecting;
};

export default connectDB;
