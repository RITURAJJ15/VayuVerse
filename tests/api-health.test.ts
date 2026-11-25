import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { healthHandler } from "../api/health";
import { healthResponseSchema } from "../api/_lib/validation";

describe("/api/health handler", () => {
  it("responds with valid health payload containing status ok", () => {
    let capturedPayload: unknown = null;
    const req = {} as Request;
    const res = {
      json: vi.fn((data: unknown) => {
        capturedPayload = data;
        return res;
      }),
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    healthHandler(req, res);

    expect(res.json).toHaveBeenCalled();
    expect(capturedPayload).not.toBeNull();

    const parsed = healthResponseSchema.safeParse(capturedPayload);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.status).toBe("ok");
      expect(parsed.data.version).toBe("0.1.0");
      expect(parsed.data.configuredKeys).toHaveProperty("OPENAQ_API_KEY");
      expect(parsed.data.configuredKeys).toHaveProperty("GEMINI_API_KEY");
    }
  });
});
