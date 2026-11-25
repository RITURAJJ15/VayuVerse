/**
 * Local development API server.
 *
 * In production, the /api/* routes are deployed as Vercel serverless
 * functions. During local dev, this Express server serves the same
 * handlers so the Vite proxy has something to hit.
 */

import "dotenv/config";
import express from "express";
import dns from "node:dns";
import { healthHandler } from "../api/health.js";
import { locationsHandler } from "../api/locations.js";
import { airQualityHandler } from "../api/air-quality.js";
import { forecastHandler } from "../api/forecast.js";
import { recommendationsHandler } from "../api/recommendations.js";
import { routesHandler } from "../api/routes.js";

// Ensure IPv4 first on Node.js to prevent IPv6 timeout on Windows
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const app = express();
const PORT = 3001;

app.use(express.json());

// ── API routes ──────────────────────────────────────────────
app.get("/api/health", healthHandler);
app.get("/api/locations", locationsHandler);
app.get("/api/air-quality", airQualityHandler);
app.get("/api/forecast", forecastHandler);
app.post("/api/recommendations", recommendationsHandler);
app.post("/api/ai/recommendations", recommendationsHandler);
app.post("/api/routes", routesHandler);

app.listen(PORT, () => {
  console.log(`[api] Dev API server running on http://localhost:${PORT}`);
});
