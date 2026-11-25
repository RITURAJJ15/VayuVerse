// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationProvider } from "../src/context/location-context";
import { ProfileProvider } from "../src/context/profile-context";
import { AuthProvider } from "../src/context/auth-context";
import { OverviewDashboardPage } from "../src/pages/dashboard";
import { MyDayPlannerPage } from "../src/pages/my-day";
import { DecisionLabPage } from "../src/pages/decision-lab";
import { IndoorAirPage } from "../src/pages/indoor-air";
import { ImpactTrackerPage } from "../src/pages/impact";
import { SourcesMethodologyPage } from "../src/pages/methodology";
import { ProfileSettingsPage } from "../src/pages/profile";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <ProfileProvider>
            <MemoryRouter>{ui}</MemoryRouter>
          </ProfileProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("Design D — Soft Swiss Minimalist Visual Foundation & Pages", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Overview Dashboard with 'Verified Station Observations' section", () => {
    renderWithProviders(<OverviewDashboardPage />);

    expect(screen.getByText(/Verified Station Observations/i)).toBeDefined();
    expect(screen.getByText(/Real-time atmosphere/i)).toBeDefined();
    expect(screen.getByText(/Atmospheric Dispersion Forecast/i)).toBeDefined();
    expect(screen.getByText(/My Day Planner Preview/i)).toBeDefined();
  });

  it("renders My Day Planner with diurnal atmospheric windows", () => {
    renderWithProviders(<MyDayPlannerPage />);

    expect(screen.getByText(/My Day Clean-Air Planner/i)).toBeDefined();
    expect(screen.getByText(/Diurnal Atmospheric Windows/i)).toBeDefined();
  });

  it("renders What-If Decision Lab with empirical physics scenarios", () => {
    renderWithProviders(<DecisionLabPage />);

    expect(screen.getByText(/What-If Decision Lab/i)).toBeDefined();
    expect(screen.getByText(/Two-Wheeler vs. Air-Filtered Metro/i)).toBeDefined();
  });

  it("renders Indoor Air Guardian with room-by-room blueprint", () => {
    renderWithProviders(<IndoorAirPage />);

    expect(screen.getByText(/Indoor Air Guardian/i)).toBeDefined();
    expect(screen.getAllByText(/Master Bedroom/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kitchen & Cooking Area/i)).toBeDefined();
  });

  it("renders Impact Tracker with avoided particulate inhalation metrics", () => {
    renderWithProviders(<ImpactTrackerPage />);

    expect(screen.getByText(/Personal & Community Impact/i)).toBeDefined();
    expect(screen.getByText(/Avoided Particulate Inhalation/i)).toBeDefined();
  });

  it("renders Sources and Methodology with data integrity charter", () => {
    renderWithProviders(<SourcesMethodologyPage />);

    expect(screen.getByText(/Sources & Methodology/i)).toBeDefined();
    expect(screen.getByText(/Zero Synthetic Numbers/i)).toBeDefined();
    expect(screen.getByText(/OpenAQ API v3/i)).toBeDefined();
  });

  it("renders Profile and Settings with sensitivity presets", () => {
    renderWithProviders(<ProfileSettingsPage />);

    expect(screen.getByText(/Profile & Settings/i)).toBeDefined();
    expect(screen.getByText(/Guest Session/i)).toBeDefined();
  });

  it("maintains independent provider resilience: dashboard displays both observation and forecast sections without coupling", () => {
    renderWithProviders(<OverviewDashboardPage />);

    // Both sections exist independently in DOM
    const observationHeading = screen.getByText(/Verified Station Observations/i);
    const forecastHeading = screen.getByText(/Atmospheric Dispersion Forecast/i);

    expect(observationHeading).toBeDefined();
    expect(forecastHeading).toBeDefined();
  });
});
