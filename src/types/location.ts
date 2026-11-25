/** Location and geocoding types */

export interface GeoLocation {
  id: number | string;
  name: string;
  state: string;
  district?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  admin1?: string;      // alias for state
  admin2?: string;      // alias for district
  population?: number;
}

export interface IndianCityPreset extends GeoLocation {
  stationCount?: number;
}

export const POPULAR_INDIAN_CITIES: IndianCityPreset[] = [
  {
    id: 1,
    name: "New Delhi",
    state: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    country: "India",
    countryCode: "IN",
    admin1: "Delhi",
    timezone: "Asia/Kolkata",
    stationCount: 38,
  },
  {
    id: 2,
    name: "Mumbai",
    state: "Maharashtra",
    latitude: 19.076,
    longitude: 72.8777,
    country: "India",
    countryCode: "IN",
    admin1: "Maharashtra",
    timezone: "Asia/Kolkata",
    stationCount: 22,
  },
  {
    id: 3,
    name: "Bengaluru",
    state: "Karnataka",
    latitude: 12.9716,
    longitude: 77.5946,
    country: "India",
    countryCode: "IN",
    admin1: "Karnataka",
    timezone: "Asia/Kolkata",
    stationCount: 14,
  },
  {
    id: 4,
    name: "Kolkata",
    state: "West Bengal",
    latitude: 22.5726,
    longitude: 88.3639,
    country: "India",
    countryCode: "IN",
    admin1: "West Bengal",
    timezone: "Asia/Kolkata",
    stationCount: 11,
  },
  {
    id: 5,
    name: "Hyderabad",
    state: "Telangana",
    latitude: 17.385,
    longitude: 78.4867,
    country: "India",
    countryCode: "IN",
    admin1: "Telangana",
    timezone: "Asia/Kolkata",
    stationCount: 10,
  },
  {
    id: 6,
    name: "Chennai",
    state: "Tamil Nadu",
    latitude: 13.0827,
    longitude: 80.2707,
    country: "India",
    countryCode: "IN",
    admin1: "Tamil Nadu",
    timezone: "Asia/Kolkata",
    stationCount: 9,
  },
  {
    id: 7,
    name: "Pune",
    state: "Maharashtra",
    latitude: 18.5204,
    longitude: 73.8567,
    country: "India",
    countryCode: "IN",
    admin1: "Maharashtra",
    timezone: "Asia/Kolkata",
    stationCount: 8,
  },
  {
    id: 8,
    name: "Lucknow",
    state: "Uttar Pradesh",
    latitude: 26.8467,
    longitude: 80.9462,
    country: "India",
    countryCode: "IN",
    admin1: "Uttar Pradesh",
    timezone: "Asia/Kolkata",
    stationCount: 7,
  },
  {
    id: 9,
    name: "Ahmedabad",
    state: "Gujarat",
    latitude: 23.0225,
    longitude: 72.5714,
    country: "India",
    countryCode: "IN",
    admin1: "Gujarat",
    timezone: "Asia/Kolkata",
    stationCount: 9,
  },
  {
    id: 10,
    name: "Varanasi",
    state: "Uttar Pradesh",
    latitude: 25.3176,
    longitude: 82.9739,
    country: "India",
    countryCode: "IN",
    admin1: "Uttar Pradesh",
    timezone: "Asia/Kolkata",
    stationCount: 4,
  },
];

export interface LocationSearchResult {
  results: GeoLocation[];
  query?: string;
  total: number;
}
