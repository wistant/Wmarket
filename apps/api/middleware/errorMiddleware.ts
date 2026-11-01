import { Request, Response, NextFunction } from "express";

type AnyError = {
  name?: string;
  message?: string;
  stack?: string;
  code?: number | string;
  kind?: string;
  path?: string;
  type?: string;
  status?: number;
  statusCode?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
  cause?: { statusCode?: number };
};

const isDev = () => process.env.NODE_ENV === "development";

/** Unknown routes get a JSON 404 instead of Express's HTML page. */
const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Turns every error into a JSON response with a fitting status:
 * - explicit statuses (HttpError, http-errors, or res.status() set by a controller)
 * - bad input from clients (malformed JSON, invalid ids, validation, duplicates,
 *   oversized bodies, upload limits, bad tokens) as 4xx
 * - anything unexpected as 500, with internals hidden outside development
 */
const errorHandler = (err: AnyError, req: Request, res: Response, next: NextFunction) => {
  // A response is already streaming; let Express close the connection.
  if (res.headersSent) return next(err);

  const explicitStatus =
    err.statusCode ?? err.status ?? err.cause?.statusCode ??
    (res.statusCode >= 400 ? res.statusCode : undefined);

  let statusCode = explicitStatus ?? 500;
  let message = err.message || "Something went wrong";

  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Malformed JSON in request body";
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  } else if (err.name === "CastError") {
    // Invalid ObjectId (or other cast) in params/query/body
    statusCode = err.kind === "ObjectId" ? 404 : 400;
    message = err.kind === "ObjectId" ? "Resource not found" : `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue ?? {})[0];
    message = field ? `A record with this ${field} already exists` : "Duplicate record";
  } else if (err.name === "ValidationError" && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .filter(Boolean)
      .join(", ");
  } else if (err.name === "MulterError") {
    statusCode = 400;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = err.name === "TokenExpiredError" ? "Session expired, please sign in again" : "Invalid token";
  }

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    // An unexpected crash (no status chosen by our code) may carry internals
    // such as "Cannot read properties of undefined"; don't send those out.
    if (explicitStatus === undefined && !isDev()) {
      message = "Something went wrong. Please try again.";
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: isDev() ? err.stack : null,
  });
};

export { notFound, errorHandler };
