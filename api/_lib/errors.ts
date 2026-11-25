/**
 * Standardised API error helper.
 */

export class ApiHandlerError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiHandlerError";
  }
}

/**
 * Wraps an async handler to catch errors and return JSON error responses.
 */
export function withErrorHandler(
  handler: (req: import("express").Request, res: import("express").Response) => Promise<void>
) {
  return async (req: import("express").Request, res: import("express").Response) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof ApiHandlerError) {
        res.status(err.statusCode).json({
          error: err.message,
          details: err.details,
        });
      } else {
        console.error("[api] Unhandled error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
}
