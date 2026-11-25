/**
 * /api/health — Health check endpoint.
 *
 * Returns the server status and which environment variables
 * are configured (without revealing their values).
 */

import type { Request, Response } from "express";

export function healthHandler(_req: Request, res: Response) {
  const envStatus = {
    OPENAQ_API_KEY: !!process.env.OPENAQ_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    OPENROUTESERVICE_API_KEY: !!process.env.OPENROUTESERVICE_API_KEY,
    SUPABASE_URL: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    SUPABASE_ANON_KEY: !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
  };

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    environment: process.env.NODE_ENV || "development",
    configuredKeys: envStatus,
  });
}

// Vercel serverless export
export default function handler(req: Request, res: Response) {
  return healthHandler(req, res);
}
