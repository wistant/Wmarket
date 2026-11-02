import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import swaggerUi from "swagger-ui-express";
import connectDB from "./config/db.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { HttpError } from "./utils/httpError.js";
import { specs } from "./config/swagger.js";

// Load env vars
dotenv.config();

// Without these the API can't serve anything; report it loudly and answer
// 503 (see below) rather than crashing the process, which would only show a
// generic platform error page.
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`[config] Missing required environment variables: ${missingEnv.join(", ")}`);
} else if ((process.env.JWT_SECRET as string).length < 32) {
  console.warn("[security] JWT_SECRET is shorter than 32 characters; use a long random value.");
}

// A stray rejected promise (e.g. a fire-and-forget email or log write) must
// not take the whole API down; log it instead of letting Node exit.
process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled promise rejection:", reason);
});

// Start connecting right away; requests wait for it below.
connectDB().catch(() => {
  /* logged in connectDB; the next request retries */
});

const app = express();

// Set trust proxy for rate limiter to parse IPs correctly when behind proxies (Vercel, Nginx, load balancers)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" })); // Required for images that might be loaded cross-origin

// Compression
app.use(compression());

// Enhanced CORS configuration
const allowedOrigins = [
  process.env.ADMIN_URL,
  process.env.CLIENT_URL,
  process.env.PRODUCTION_ADMIN_URL,
  process.env.PRODUCTION_CLIENT_URL,
  // Add production URLs - new domain
  "https://sellzy.reactbd.com",
  "https://admin.sellzy.reactbd.com",
  "https://api.sellzy.reactbd.com",

  // Add localhost for development
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081", // iOS simulator
  "http://10.0.2.2:8081", // Android emulator
  "http://10.0.2.2:8000", // Android emulator direct access
  // "http://192.168.1.100:8081", // Replace with your actual local IP for physical devices
].filter(Boolean) as string[]; // Remove any undefined values

app.use(
  cors({
    origin: function (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }

      // Check if origin is in our allowed list, a reactbd.com subdomain, or plain localhost
      if (
        allowedOrigins.indexOf(origin) !== -1 ||
        /^https:\/\/([a-z0-9-]+\.)*reactbd\.com$/i.test(origin) ||
        /^http:\/\/localhost(:\d+)?$/i.test(origin)
      ) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Origin not explicitly allowed: ${origin}`);
        // Instead of throwing an error which results in a 500 Internal Server Error,
        // we pass (null, false) to allow the browser to handle the CORS failure naturally.
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Every API request needs the database: wait for the shared connection and
// answer 503 while it's unavailable, instead of timing out inside a query.
app.use("/api", async (req, res, next) => {
  if (missingEnv.length) {
    next(new HttpError(503, "Server is not configured correctly. Please try again later."));
    return;
  }
  try {
    await connectDB();
    next();
  } catch (error) {
    next(
      new HttpError(503, "Database is temporarily unavailable. Please try again shortly.", {
        cause: error,
      }),
    );
  }
});

// Stripe Webhook MUST be routed before express.json() to preserve the raw request buffer for signature verification

// Body size limit for JSON and URL-encoded payloads.
// Sized to accommodate base64-encoded image uploads (e.g. vendor product images)
// up to ~10 MB raw. base64 adds ~33% overhead, so a 10 MB file ≈ 13.4 MB encoded.
// 15mb leaves headroom for additional JSON fields without inviting payload DOS.
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Express 5 leaves req.body undefined when no parser ran (no body, or another
// content type); default it so `const { x } = req.body` can't throw.
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});

// where req.query is a read-only getter and standard assignment fails.
app.use((req, res, next) => {
  ["body", "params", "headers", "query"].forEach((key) => {
    const reqKey = key as keyof express.Request;
    if (req[reqKey]) {
      const sanitized = mongoSanitize.sanitize(req[reqKey]);
      try {
        // Try standard assignment first (works for body, params)
        // @ts-ignore
        req[reqKey] = sanitized;
      } catch (e) {
        // Fallback for read-only properties like req.query in Express 5
        Object.defineProperty(req, key, {
          value: sanitized,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    }
  });
  next();
});

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Rate Limiting Config
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 2000, // Limit each IP to 2000 requests per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Skip rate limiting for localhost during development
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || "";
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "::ffff:127.0.0.1" ||
      process.env.NODE_ENV === "development"
    );
  },
});

// Apply general limiter to /api
app.use("/api/", apiLimiter);

// Additional headers for Swagger UI in production
app.use(
  "/api/docs",
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
);

// API Documentation
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .scheme-container { background: #fafafa; padding: 30px }
    `,
    customSiteTitle: "Sellzy API Documentation",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "none",
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
  }),
);

// Home route
app.get("/", (req: express.Request, res: express.Response) => {
  res.json({
    message: "WMarket API is running...",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    docs: `${req.protocol}://${req.get("host")}/api/docs`,
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      products: "/api/products",
      categories: "/api/categories",
      brands: "/api/brands",
      upload: "/api/upload",
      docs: "/api/docs",
    },
  });
});

// Health check route
app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// Swagger docs redirect and info
app.get("/docs", (req: express.Request, res: express.Response) => {
  res.redirect("/api/docs");
});

app.get("/api/docs.json", (req: express.Request, res: express.Response) => {
  res.json(specs);
});

app.get("/api/docs/info", (req: express.Request, res: express.Response) => {
  res.json({
    swagger: "Available",
    url: `${req.protocol}://${req.get("host")}/api/docs`,
    specs: specs ? "Loaded" : "Not loaded",
    environment: process.env.NODE_ENV,
  });
});

// Unknown routes, then the central error handler
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8000;
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
    );
  });
}

export default app;
