import dns from "node:dns";
import { ApiHandlerError } from "./errors.js";

// Ensure IPv4 first on Node.js to prevent IPv6 connect timeout on Windows
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where not configurable
}

export interface GeocodedLocation {
  id: number | string;
  name: string;
  state: string;
  district?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
}

interface OpenMeteoGeoItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
  population?: number;
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoGeoItem[];
  generationtime_ms?: number;
}

/**
 * Searches for locations across India using Open-Meteo Geocoding API and Photon OSM Geocoding.
 * Prioritizes and filters for Indian locations, then deduplicates by name + state.
 */
export async function searchIndianLocations(
  query: string,
  count = 10
): Promise<GeocodedLocation[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const encoded = encodeURIComponent(trimmed);
  const fetchCount = Math.max(count * 2, 20);

  // Parallel lookup: Open-Meteo (cities/districts) + Photon OSM (landmarks/sectors/neighborhoods)
  const openMeteoPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=${fetchCount}&language=en&format=json`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "VayuVerse-AirQualityNavigator/1.0" },
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data = (await res.json()) as OpenMeteoGeoResponse;
      return Array.isArray(data.results) ? data.results : [];
    } catch {
      return [];
    }
  })();

  const photonPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const url = `https://photon.komoot.io/api/?q=${encoded}&limit=${count}&bbox=68.0,6.0,98.0,38.0`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "VayuVerse-AirQualityNavigator/1.0" },
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.features) ? data.features : [];
    } catch {
      return [];
    }
  })();

  const [omResults, photonFeatures] = await Promise.all([openMeteoPromise, photonPromise]);

  const indianResults: GeocodedLocation[] = [];
  const seenKeys = new Set<string>();

  // 1. Process Photon results (often more precise for landmarks, sectors, neighborhoods)
  for (const feat of photonFeatures) {
    const props = feat.properties || {};
    const coords = feat.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);

    const isIndia =
      props.countrycode === "IN" ||
      props.country === "India" ||
      (lat >= 6.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0);

    if (!isIndia) continue;

    const name = props.name || props.street || trimmed;
    const state = props.state || "India";
    const district = props.city || props.district || props.county;
    const dedupeKey = `${name.toLowerCase()}|${state.toLowerCase()}|${lat.toFixed(2)}|${lng.toFixed(2)}`;

    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    indianResults.push({
      id: `osm-${props.osm_id || Math.random()}`,
      name,
      state,
      district,
      country: "India",
      countryCode: "IN",
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lng.toFixed(4)),
      timezone: "Asia/Kolkata",
    });
  }

  // 2. Process Open-Meteo results
  for (const item of omResults) {
    const isIndia =
      item.country_code?.toUpperCase() === "IN" ||
      (item.latitude >= 6.0 &&
        item.latitude <= 38.0 &&
        item.longitude >= 68.0 &&
        item.longitude <= 98.0);

    const state = item.admin1 || (isIndia ? "India" : item.country || "Unknown");
    const dedupeKey = `${item.name.toLowerCase()}|${state.toLowerCase()}|${item.latitude.toFixed(2)}|${item.longitude.toFixed(2)}`;

    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const mapped: GeocodedLocation = {
      id: item.id,
      name: item.name,
      state,
      district: item.admin2,
      country: isIndia ? "India" : item.country || "Unknown",
      countryCode: item.country_code || (isIndia ? "IN" : "UNKNOWN"),
      latitude: Number(item.latitude.toFixed(4)),
      longitude: Number(item.longitude.toFixed(4)),
      timezone: item.timezone || "Asia/Kolkata",
      population: item.population,
    };

    if (isIndia) {
      indianResults.push(mapped);
    }
  }

  if (indianResults.length === 0 && omResults.length === 0 && photonFeatures.length === 0) {
    // If both completely failed due to network errors, handle gracefully
    return [];
  }

  return indianResults.slice(0, count);
}

/**
 * Reverse geocodes coordinates to find the nearest Indian locality.
 * Rejects coordinates strictly outside India's geographic bounds.
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<GeocodedLocation> {
  // Validate coordinates within India's approximate geographic bounding box
  if (latitude < 6.0 || latitude > 38.0 || longitude < 68.0 || longitude > 98.0) {
    throw new ApiHandlerError(
      400,
      "Coordinates fall outside India. VayuVerse is tailored for Indian environmental navigation."
    );
  }

  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "VayuVerse-AirQualityNavigator/1.0",
      },
    });
    clearTimeout(timeout);
  } catch (err) {
    throw new ApiHandlerError(502, "Reverse geocoding connection failed", err);
  }

  if (!response.ok) {
    throw new ApiHandlerError(response.status, "Reverse geocoding failed");
  }

  interface BigDataCloudReverse {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryName?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
  }

  const data = (await response.json()) as BigDataCloudReverse;
  const name = data.city || data.locality || "Current Location";
  const state = data.principalSubdivision || "India";

  return {
    id: `geo-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
    name,
    state,
    country: data.countryName || "India",
    countryCode: data.countryCode || "IN",
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
    timezone: "Asia/Kolkata",
  };
}
