/**
 * An error that carries the HTTP status to respond with.
 * Throw it from controllers or services; the central error handler turns it
 * into a JSON response with this status and message.
 */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

/** 503 for a feature whose third-party service isn't configured on this server. */
export const serviceUnavailable = (service: string) =>
  new HttpError(503, `${service} is not configured on the server`);

/** Return the client, or throw a 503 when the service isn't configured. */
export function requireService<T>(client: T | null | undefined, service: string): T {
  if (!client) throw serviceUnavailable(service);
  return client;
}

/**
 * The error detail that is safe to put in a response body: everything in
 * development; in production only messages we wrote (HttpError) or client
 * mistakes (validation, bad ids). Unexpected server errors stay in the logs.
 */
export function clientErrorDetail(error: unknown): string | undefined {
  const e = error as { message?: string; name?: string } | null | undefined;
  if (process.env.NODE_ENV === "development") return e?.message;
  if (error instanceof HttpError) return error.message;
  if (e?.name === "ValidationError" || e?.name === "CastError") return e.message;
  return undefined;
}
