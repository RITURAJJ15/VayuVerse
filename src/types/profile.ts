/**
 * VayuVerse User Profile & Personalization System Types
 * Designed for guest-first local personalization without forced authentication.
 */

export type UserCategory =
  | "college_student"
  | "office_commuter"
  | "parent_child"
  | "senior_citizen"
  | "general_individual"
  | "family_household";

export type AgeGroup = "18-24" | "25-34" | "35-50" | "51-64" | "65+";

export type CommuteMode =
  | "metro"
  | "two_wheeler"
  | "bus"
  | "cab_car"
  | "walk_cycle"
  | "minimal";

export type OutdoorActivity =
  | "morning_walk_jog"
  | "evening_sports"
  | "market_errands"
  | "school_drop_pickup"
  | "none";

export type ScheduleFlexibility = "high" | "moderate" | "low";

export type PollutionSensitivity = "normal" | "moderate" | "high";

export type HomeType =
  | "apartment_sealed"
  | "ventilated_flat"
  | "standalone_house"
  | "independent_floor";

export type CookingFuel =
  | "lpg_chimney"
  | "lpg_no_chimney"
  | "electric_induction"
  | "biomass_chulha";

export type PurifierAvailability =
  | "none"
  | "bedroom_hepa"
  | "multi_room_hepa"
  | "diy_exhaust";

export type PreferredLanguage =
  | "English"
  | "Hindi"
  | "Bengali"
  | "Assamese"
  | "Marathi";

export interface UserProfile {
  id: string; // "default" or preset id
  displayName: string;
  category: UserCategory;
  ageGroup: AgeGroup;
  sensitivity: PollutionSensitivity;
  commuteMode: CommuteMode;
  departureTime: string; // "08:30"
  returnTime: string;    // "17:30"
  wakeUpTime: string;    // "06:30"
  sleepTime: string;     // "23:00"
  outdoorActivity: OutdoorActivity;
  scheduleFlexibility: ScheduleFlexibility;
  hasChildren: boolean;
  hasSeniors: boolean;
  homeType: HomeType;
  cookingFuel: CookingFuel;
  purifierAvailability: PurifierAvailability;
  preferredLanguage: PreferredLanguage;
}

export interface EvaluatorPreset {
  id: string;
  title: string;
  subtitle: string;
  category: UserCategory;
  cityName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  state: string;
  profile: UserProfile;
  exposureRationale: string;
}

export const CATEGORY_LABELS: Record<UserCategory, string> = {
  college_student: "College Student",
  office_commuter: "Office Commuter",
  parent_child: "Parent with Children",
  senior_citizen: "Senior Citizen",
  general_individual: "General Individual",
  family_household: "Family or Household",
};

export const COMMUTE_LABELS: Record<CommuteMode, string> = {
  metro: "Metro / AC Transit",
  two_wheeler: "Two-Wheeler / Motorcycle",
  bus: "Public Bus",
  cab_car: "Cab / AC Car",
  walk_cycle: "Walking / Cycling",
  minimal: "Minimal / Work From Home",
};

export const OUTDOOR_LABELS: Record<OutdoorActivity, string> = {
  morning_walk_jog: "Morning Walk / Jog (06:00 - 08:00)",
  evening_sports: "Evening Sports / Gym (17:30 - 20:00)",
  market_errands: "Daily Market / Bazaar Errands",
  school_drop_pickup: "School Drop-off & Pickup Routine",
  none: "Minimal / Mostly Indoors",
};

export const HOME_TYPE_LABELS: Record<HomeType, string> = {
  apartment_sealed: "Modern Sealed Apartment",
  ventilated_flat: "Traditional Ventilated Flat",
  standalone_house: "Standalone House with Courtyard",
  independent_floor: "Independent Floor",
};

export const COOKING_FUEL_LABELS: Record<CookingFuel, string> = {
  lpg_chimney: "LPG Gas with Exhaust / Chimney",
  lpg_no_chimney: "LPG Gas without Chimney",
  electric_induction: "Electric / Induction",
  biomass_chulha: "Biomass / Traditional Chulha",
};

export const PURIFIER_LABELS: Record<PurifierAvailability, string> = {
  none: "No Air Purifier",
  bedroom_hepa: "HEPA Purifier in Bedroom",
  multi_room_hepa: "Multi-Room / Whole-Home Purifiers",
  diy_exhaust: "DIY Exhaust / Cross-Ventilation",
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: "default",
  displayName: "Guest Navigator",
  category: "general_individual",
  ageGroup: "25-34",
  sensitivity: "normal",
  commuteMode: "metro",
  departureTime: "08:30",
  returnTime: "18:00",
  wakeUpTime: "06:30",
  sleepTime: "23:00",
  outdoorActivity: "market_errands",
  scheduleFlexibility: "moderate",
  hasChildren: false,
  hasSeniors: false,
  homeType: "ventilated_flat",
  cookingFuel: "lpg_chimney",
  purifierAvailability: "none",
  preferredLanguage: "English",
};

export interface HealthSensitivityProfile {
  id: string;
  label: string;
  description: string;
  recommendedMask: string;
  stricterThreshold: boolean;
}

export const SENSITIVITY_PROFILES: HealthSensitivityProfile[] = [
  {
    id: "general",
    label: "General Population",
    description: "Standard NAQI precautions with active lifestyle pacing.",
    recommendedMask: "N95 during Poor/Severe",
    stricterThreshold: false,
  },
  {
    id: "respiratory",
    label: "Asthmatic & Respiratory",
    description: "Heightened sensitivity to PM2.5 and Ozone peaks.",
    recommendedMask: "N95/FFP2 above Moderate (>100)",
    stricterThreshold: true,
  },
  {
    id: "elderly_child",
    label: "Children & Seniors",
    description: "Vulnerable airway protection with indoor air prioritization.",
    recommendedMask: "N95 tailored fit",
    stricterThreshold: true,
  },
  {
    id: "outdoor_worker",
    label: "Outdoor Commuter & Worker",
    description: "High continuous daily exposure mitigation & route pacing.",
    recommendedMask: "Valved N95 / Anti-pollution mask",
    stricterThreshold: true,
  },
];

/**
 * Five One-Click Evaluator Presets
 */
export const EVALUATOR_PRESETS: EvaluatorPreset[] = [
  {
    id: "delhi_student",
    title: "Delhi College Student",
    subtitle: "Morning travel & evening campus activities",
    category: "college_student",
    cityName: "New Delhi",
    coordinates: { latitude: 28.6139, longitude: 77.209 },
    state: "Delhi",
    exposureRationale:
      "High morning exposure during the 08:00 AM surface temperature inversion; evening campus sports outdoors.",
    profile: {
      id: "delhi_student",
      displayName: "Aarav (Delhi Student)",
      category: "college_student",
      ageGroup: "18-24",
      sensitivity: "moderate",
      commuteMode: "metro",
      departureTime: "08:00",
      returnTime: "16:30",
      wakeUpTime: "06:45",
      sleepTime: "00:00",
      outdoorActivity: "evening_sports",
      scheduleFlexibility: "moderate",
      hasChildren: false,
      hasSeniors: false,
      homeType: "ventilated_flat",
      cookingFuel: "lpg_no_chimney",
      purifierAvailability: "none",
      preferredLanguage: "Hindi",
    },
  },
  {
    id: "noida_commuter",
    title: "Noida Office Commuter",
    subtitle: "Arterial highway motorcycle commute",
    category: "office_commuter",
    cityName: "Noida",
    coordinates: { latitude: 28.5355, longitude: 77.391 },
    state: "Uttar Pradesh",
    exposureRationale:
      "Substantial particulate inhalation during two-wheeler highway commute; rigid corporate office hours with low schedule flexibility.",
    profile: {
      id: "noida_commuter",
      displayName: "Priya (Noida Commuter)",
      category: "office_commuter",
      ageGroup: "25-34",
      sensitivity: "normal",
      commuteMode: "two_wheeler",
      departureTime: "09:15",
      returnTime: "18:45",
      wakeUpTime: "07:00",
      sleepTime: "23:30",
      outdoorActivity: "none",
      scheduleFlexibility: "low",
      hasChildren: false,
      hasSeniors: false,
      homeType: "apartment_sealed",
      cookingFuel: "lpg_chimney",
      purifierAvailability: "bedroom_hepa",
      preferredLanguage: "English",
    },
  },
  {
    id: "mumbai_parent",
    title: "Mumbai Parent",
    subtitle: "Managing dual school routines & park hours",
    category: "parent_child",
    cityName: "Mumbai",
    coordinates: { latitude: 19.076, longitude: 72.8777 },
    state: "Maharashtra",
    exposureRationale:
      "Multiple outdoor school commute windows; high protective vigilance for developing child airways against coastal particulate humidity.",
    profile: {
      id: "mumbai_parent",
      displayName: "Meera (Mumbai Parent)",
      category: "parent_child",
      ageGroup: "35-50",
      sensitivity: "high",
      commuteMode: "cab_car",
      departureTime: "07:15",
      returnTime: "14:00",
      wakeUpTime: "06:00",
      sleepTime: "22:30",
      outdoorActivity: "school_drop_pickup",
      scheduleFlexibility: "low",
      hasChildren: true,
      hasSeniors: false,
      homeType: "ventilated_flat",
      cookingFuel: "lpg_chimney",
      purifierAvailability: "bedroom_hepa",
      preferredLanguage: "English",
    },
  },
  {
    id: "kolkata_senior",
    title: "Kolkata Senior Household",
    subtitle: "Early dawn walks & high cardio-respiratory vigilance",
    category: "senior_citizen",
    cityName: "Kolkata",
    coordinates: { latitude: 22.5726, longitude: 88.3639 },
    state: "West Bengal",
    exposureRationale:
      "Early morning outdoor walk routine during nocturnal stagnant boundary layer hours before daytime thermal convective dilution.",
    profile: {
      id: "kolkata_senior",
      displayName: "Dr. Chatterjee (Kolkata Senior)",
      category: "senior_citizen",
      ageGroup: "65+",
      sensitivity: "high",
      commuteMode: "walk_cycle",
      departureTime: "06:15",
      returnTime: "07:30",
      wakeUpTime: "05:30",
      sleepTime: "21:30",
      outdoorActivity: "morning_walk_jog",
      scheduleFlexibility: "high",
      hasChildren: false,
      hasSeniors: true,
      homeType: "standalone_house",
      cookingFuel: "lpg_no_chimney",
      purifierAvailability: "none",
      preferredLanguage: "Bengali",
    },
  },
  {
    id: "guwahati_family",
    title: "Guwahati Household",
    subtitle: "Multigenerational home with evening bazaar visits",
    category: "family_household",
    cityName: "Guwahati",
    coordinates: { latitude: 26.1445, longitude: 91.7362 },
    state: "Assam",
    exposureRationale:
      "Multigenerational indoor-outdoor dynamics with evening outdoor market errands; valley boundary layer retention in winter.",
    profile: {
      id: "guwahati_family",
      displayName: "Baruah Household (Guwahati)",
      category: "family_household",
      ageGroup: "35-50",
      sensitivity: "moderate",
      commuteMode: "bus",
      departureTime: "08:45",
      returnTime: "17:30",
      wakeUpTime: "06:00",
      sleepTime: "22:30",
      outdoorActivity: "market_errands",
      scheduleFlexibility: "moderate",
      hasChildren: true,
      hasSeniors: true,
      homeType: "independent_floor",
      cookingFuel: "lpg_no_chimney",
      purifierAvailability: "diy_exhaust",
      preferredLanguage: "Assamese",
    },
  },
];
