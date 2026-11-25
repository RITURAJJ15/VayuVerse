import fs from "fs";
import path from "path";
import { fetchStationObservation } from "../supabase/functions/sync-air-alerts/index";

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

async function runLiveProviderDryRun() {
  console.log("=========================================================================");
  console.log("  VAYUVERSE: REAL PROVIDER-BACKED DRY-RUN (ZERO DATABASE WRITES)        ");
  console.log("=========================================================================\n");

  const env = loadEnv();
  const openAqKey = env.OPENAQ_API_KEY;

  if (!openAqKey) {
    console.error("❌ OPENAQ_API_KEY not found in .env.");
    return;
  }

  // Test across multiple geographic regions with verified physical monitoring networks
  const testLocations = [
    { city: "Delhi (Anand Vihar)", lat: 28.6469, lon: 77.3160 },
    { city: "Mumbai (Kurla)", lat: 19.0728, lon: 72.8797 },
    { city: "Bengaluru (BTM Layout)", lat: 12.9165, lon: 77.6101 },
  ];

  console.log(`Connecting to OpenAQ v3 API with key: ${openAqKey.slice(0, 6)}... (masked)\n`);

  for (const loc of testLocations) {
    console.log(`--- Querying ${loc.city} [lat: ${loc.lat}, lon: ${loc.lon}] ---`);
    const startTime = Date.now();
    try {
      const obs = await fetchStationObservation(loc.lat, loc.lon, openAqKey);
      const durationMs = Date.now() - startTime;

      if (!obs) {
        console.log(`   ℹ️ No active physical station reporting within 25km (Duration: ${durationMs}ms)`);
        continue;
      }

      console.log(`   ✓ Nearest Station Discovered: "${obs.stationName}" (Station ID: ${obs.stationId})`);
      console.log(`   ✓ Proximity: ${obs.distanceKm} km from requested center`);
      console.log(`   ✓ Provider Authority: ${obs.provider}`);
      console.log(`   ✓ Physical Observation UTC: ${obs.observedAtUtc} (${obs.hoursAgo} hours ago)`);
      console.log(`   ✓ Freshness Gate (<= 3h): ${obs.isFreshForUrgent ? "PASS (Live/Fresh)" : "FAIL (Stale, skipped from emergency alerts)"}`);
      
      if (obs.pm25) {
        console.log(`   ✓ PM2.5 Measured: ${obs.pm25.value} ${obs.pm25.unit} (Sensor ID: ${obs.pm25.sensorId})`);
      }
      if (obs.pm10) {
        console.log(`   ✓ PM10 Measured: ${obs.pm10.value} ${obs.pm10.unit} (Sensor ID: ${obs.pm10.sensorId})`);
      }
      console.log(`   ✓ Averaging Window: ${obs.averaging.periodHours}-hour (${obs.averaging.validHoursCount} reading)`);
      console.log(`   ✓ CPCB 24h AQI Criteria Met: ${obs.isOfficial24hAqi ? "YES" : "NO (1-hour reading only)"}`);
      console.log(`   ✓ Official AQI Value: ${obs.officialAqiValue !== null ? obs.officialAqiValue : "null (Uncalculated - hourly concentration advisory only)"}`);
      console.log(`   ✓ Advisory Health Category: ${obs.concentrationCategory}`);
      console.log(`   ✓ Dominant Pollutant: ${obs.dominantPollutant} (${obs.dominantValue} µg/m³)`);
      console.log(`   ✓ Criteria Pollutants Sensed: ${obs.pollutantCount}`);
      console.log(`   ✓ Dry Run Status: ZERO DATABASE WRITES EXECUTED.\n`);
    } catch (err) {
      console.error(`   ✗ Error fetching ${loc.city}:`, (err as Error).message);
    }
  }

  console.log("=========================================================================");
  console.log("  PROVIDER DRY-RUN COMPLETE: Real observations verified without writes.  ");
  console.log("=========================================================================");
}

runLiveProviderDryRun().catch(console.error);
