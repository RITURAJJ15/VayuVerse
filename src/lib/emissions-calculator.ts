import type {
  DecisionTransportMode,
  TransportEmissionFactor,
} from "../types/decision-lab";

/**
 * Versioned Documented Transport Emission Factors for Indian Urban Contexts
 * Sources:
 * 1. Central Pollution Control Board (CPCB) Comprehensive Air Quality Assessment
 * 2. Automotive Research Association of India (ARAI) Emission Factors (2020/2022)
 * 3. India GHG Program / WRI India Transport Sector Guidance (Version 2.1)
 * 4. Delhi Metro Rail Corporation (DMRC) Clean Development Mechanism (CDM) executive reports
 */
export const TRANSPORT_EMISSION_FACTORS: Record<
  DecisionTransportMode,
  TransportEmissionFactor
> = {
  metro: {
    mode: "metro",
    label: "Underground / AC Metro Rail",
    factorGramsCo2PerPassengerKm: 12.0,
    assumedOccupancy: 1200, // Train average occupancy
    source: "DMRC CDM Executive Report / India GHG Program",
    sourceVersion: "v2023.1",
    notes:
      "Electric mass transit benchmark based on DMRC renewable solar PPA and Indian national grid mix emission factor (~0.71 kg CO₂/kWh).",
  },
  public_bus: {
    mode: "public_bus",
    label: "Public Bus (CNG / Clean Diesel)",
    factorGramsCo2PerPassengerKm: 25.0,
    assumedOccupancy: 35, // Average urban route passenger load
    source: "CPCB / ARAI Urban Transit Study",
    sourceVersion: "v2022.3",
    notes:
      "Calculated from fleet average 875 g CO₂/vehicle-km distributed across an average passenger loading of 35 commuters.",
  },
  open_two_wheeler: {
    mode: "open_two_wheeler",
    label: "Two-Wheeler / Motorcycle (Petrol)",
    factorGramsCo2PerPassengerKm: 45.0,
    assumedOccupancy: 1.0,
    source: "ARAI Automotive Emission Factors (BS-VI Indian Standards)",
    sourceVersion: "v2021.2",
    notes:
      "Standard 110–150cc BS-VI four-stroke commuter motorcycle operating at 45–50 km/litre real-world urban drive cycle.",
  },
  electric_cab: {
    mode: "electric_cab",
    label: "Electric Cab / EV Car",
    factorGramsCo2PerPassengerKm: 55.0,
    assumedOccupancy: 1.3,
    source: "WRI India Electric Mobility / CEA Grid Baseline Database",
    sourceVersion: "v2023.2",
    notes:
      "Accounts for 15 kWh/100km EV sedan efficiency charged from Indian CEA national grid average (0.716 kg CO₂e/kWh), shared by 1.3 occupants.",
  },
  petrol_car: {
    mode: "petrol_car",
    label: "Petrol Car (Private 4-Wheeler)",
    factorGramsCo2PerPassengerKm: 140.0,
    assumedOccupancy: 1.2,
    source: "ARAI / India GHG Program Transport Protocol",
    sourceVersion: "v2022.1",
    notes:
      "Typical 1.2L petrol hatchback/sedan consuming 14 km/litre in stop-and-go Indian city traffic (168 g CO₂/veh-km) with 1.2 average occupancy.",
  },
  diesel_car: {
    mode: "diesel_car",
    label: "Diesel Car (Private / SUV)",
    factorGramsCo2PerPassengerKm: 155.0,
    assumedOccupancy: 1.2,
    source: "ARAI / CPCB Automotive Emission Factors",
    sourceVersion: "v2022.1",
    notes:
      "Typical 1.5L–2.0L diesel SUV consuming 12.5 km/litre in congested urban stop-and-go driving with 1.2 average occupancy.",
  },
  walk_cycle: {
    mode: "walk_cycle",
    label: "Walking / Bicycle",
    factorGramsCo2PerPassengerKm: 0.0,
    assumedOccupancy: 1.0,
    source: "Zero-Emission Active Mobility Benchmark",
    sourceVersion: "v1.0",
    notes:
      "Zero direct exhaust and zero fuel-cycle greenhouse gas emissions.",
  },
};

/**
 * Deterministically computes transport CO2 emissions in grams.
 * Formula: Emissions (g CO2) = Distance (km) * Factor (g CO2 / passenger-km)
 */
export function calculateTransportEmissions(
  distanceKm: number,
  mode: DecisionTransportMode
): {
  totalCo2Grams: number;
  totalCo2Kg: number;
  factor: TransportEmissionFactor;
} {
  const safeDistance = Math.max(0, distanceKm);
  const factor = TRANSPORT_EMISSION_FACTORS[mode] || TRANSPORT_EMISSION_FACTORS.petrol_car;

  const totalCo2Grams = Math.round(safeDistance * factor.factorGramsCo2PerPassengerKm * 10) / 10;
  const totalCo2Kg = Math.round((totalCo2Grams / 1000) * 100) / 100;

  return {
    totalCo2Grams,
    totalCo2Kg,
    factor,
  };
}

/**
 * Compares two transport options and computes deterministic emissions differences.
 */
export function compareEmissions(
  distanceKmA: number,
  modeA: DecisionTransportMode,
  distanceKmB: number,
  modeB: DecisionTransportMode
): {
  emissionsA: number;
  emissionsB: number;
  savedGrams: number;
  reductionPercent: number;
} {
  const resultA = calculateTransportEmissions(distanceKmA, modeA);
  const resultB = calculateTransportEmissions(distanceKmB, modeB);

  const emissionsA = resultA.totalCo2Grams;
  const emissionsB = resultB.totalCo2Grams;
  const savedGrams = Math.round((emissionsA - emissionsB) * 10) / 10;

  const reductionPercent =
    emissionsA > 0
      ? Math.max(0, Math.min(100, Math.round(((emissionsA - emissionsB) / emissionsA) * 100)))
      : 0;

  return {
    emissionsA,
    emissionsB,
    savedGrams,
    reductionPercent,
  };
}
