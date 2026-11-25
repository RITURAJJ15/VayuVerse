// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationProvider, useLocationState } from "../src/context/location-context";
import { ProfileProvider, useProfileState } from "../src/context/profile-context";
import { PresetSelector } from "../src/components/profile/preset-selector";
import { ProfileEditor } from "../src/components/profile/profile-editor";
import { ProfileSettingsPage } from "../src/pages/profile";
import { EVALUATOR_PRESETS, DEFAULT_USER_PROFILE } from "../src/types/profile";

function TestConsumer() {
  const { currentProfile, activePresetId, activePreset } = useProfileState();
  const { currentLocation } = useLocationState();

  return (
    <div>
      <div data-testid="active-profile-name">{currentProfile.displayName}</div>
      <div data-testid="active-category">{currentProfile.category}</div>
      <div data-testid="active-commute">{currentProfile.commuteMode}</div>
      <div data-testid="active-departure">{currentProfile.departureTime}</div>
      <div data-testid="active-sensitivity">{currentProfile.sensitivity}</div>
      <div data-testid="active-location-name">{currentLocation?.name}</div>
      <div data-testid="active-preset-id">{activePresetId || "none"}</div>
      <div data-testid="active-preset-city">{activePreset?.cityName || "none"}</div>
    </div>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <ProfileProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </ProfileProvider>
      </LocationProvider>
    </QueryClientProvider>
  );
}

describe("VayuVerse User Profile & Personalization System", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders all five one-click evaluator presets with realistic profile configurations", () => {
    renderWithProviders(<PresetSelector />);

    // 1. Delhi college student
    expect(screen.getByText(/Delhi College Student/i)).toBeDefined();
    expect(screen.getAllByText(/New Delhi/i).length).toBeGreaterThan(0);

    // 2. Noida office commuter
    expect(screen.getByText(/Noida Office Commuter/i)).toBeDefined();
    expect(screen.getAllByText(/Noida/i).length).toBeGreaterThan(0);

    // 3. Mumbai parent
    expect(screen.getByText(/Mumbai Parent/i)).toBeDefined();
    expect(screen.getAllByText(/Mumbai/i).length).toBeGreaterThan(0);

    // 4. Kolkata senior household
    expect(screen.getByText(/Kolkata Senior Household/i)).toBeDefined();
    expect(screen.getAllByText(/Kolkata/i).length).toBeGreaterThan(0);

    // 5. Guwahati family
    expect(screen.getByText(/Guwahati Household/i)).toBeDefined();
    expect(screen.getAllByText(/Guwahati/i).length).toBeGreaterThan(0);
  });

  it("switches persona when a preset card is clicked and synchronizes city location", () => {
    renderWithProviders(
      <div>
        <TestConsumer />
        <PresetSelector />
      </div>
    );

    // Initial default state
    expect(screen.getByTestId("active-profile-name").textContent).toBe(DEFAULT_USER_PROFILE.displayName);
    expect(screen.getByTestId("active-preset-id").textContent).toBe("none");

    // Click "Noida Office Commuter" preset
    const noidaCard = screen.getByTestId("preset-card-noida_commuter");
    fireEvent.click(noidaCard);

    // Profile state updates to Noida commuter
    expect(screen.getByTestId("active-profile-name").textContent).toBe("Priya (Noida Commuter)");
    expect(screen.getByTestId("active-category").textContent).toBe("office_commuter");
    expect(screen.getByTestId("active-commute").textContent).toBe("two_wheeler");
    expect(screen.getByTestId("active-location-name").textContent).toBe("Noida");
    expect(screen.getByTestId("active-preset-id").textContent).toBe("noida_commuter");

    // LocalStorage preserves the selection
    expect(localStorage.getItem("vayuverse_active_preset_id_v1")).toBe("noida_commuter");
  });

  it("proves different personas in the same or different cities produce distinct profile inputs for the recommendation engine", () => {
    // Delhi Student vs Noida Commuter vs Kolkata Senior
    const delhiStudent = EVALUATOR_PRESETS.find((p) => p.id === "delhi_student")!.profile;
    const noidaCommuter = EVALUATOR_PRESETS.find((p) => p.id === "noida_commuter")!.profile;
    const kolkataSenior = EVALUATOR_PRESETS.find((p) => p.id === "kolkata_senior")!.profile;

    // Commuting modes are distinct
    expect(delhiStudent.commuteMode).toBe("metro");
    expect(noidaCommuter.commuteMode).toBe("two_wheeler");
    expect(kolkataSenior.commuteMode).toBe("walk_cycle");

    // Departure times reflect different routines
    expect(delhiStudent.departureTime).toBe("08:00");
    expect(noidaCommuter.departureTime).toBe("09:15");
    expect(kolkataSenior.departureTime).toBe("06:15");

    // Sensitivity and household flags differ
    expect(delhiStudent.sensitivity).toBe("moderate");
    expect(kolkataSenior.sensitivity).toBe("high");
    expect(kolkataSenior.hasSeniors).toBe(true);
    expect(delhiStudent.hasSeniors).toBe(false);

    // Home environments differ
    expect(noidaCommuter.homeType).toBe("apartment_sealed");
    expect(kolkataSenior.homeType).toBe("standalone_house");
  });

  it("persists custom profile edits to localStorage without requiring authentication", () => {
    renderWithProviders(
      <div>
        <TestConsumer />
        <ProfileEditor />
      </div>
    );

    // Change commute mode dropdown to two_wheeler
    const selectInputs = screen.getAllByRole("combobox");
    const commuteSelect = selectInputs.find((el) =>
      (el as HTMLSelectElement).value === "metro"
    );
    expect(commuteSelect).toBeDefined();

    fireEvent.change(commuteSelect!, { target: { value: "two_wheeler" } });

    // Click Save Profile
    const saveBtn = screen.getByRole("button", { name: /Save Profile/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Preferences Saved!/i)).toBeDefined();

    // Verify localStorage has persisted the update
    const saved = JSON.parse(localStorage.getItem("vayuverse_user_profile_v1") || "{}");
    expect(saved.commuteMode).toBe("two_wheeler");
  });

  it("resets preferences to default profile when 'Reset Defaults' is clicked", () => {
    renderWithProviders(
      <div>
        <TestConsumer />
        <ProfileEditor />
      </div>
    );

    // Click Reset Defaults button
    const resetBtn = screen.getByRole("button", { name: /Reset Defaults/i });
    fireEvent.click(resetBtn);

    expect(screen.getByTestId("active-category").textContent).toBe("general_individual");
    expect(screen.getByTestId("active-commute").textContent).toBe("metro");
    expect(screen.getByTestId("active-preset-id").textContent).toBe("none");
  });

  it("renders the complete ProfileSettingsPage with active profile indicator and preset selection", () => {
    renderWithProviders(<ProfileSettingsPage />);

    // Active status card
    expect(screen.getByText(/Guest Navigator/i)).toBeDefined();
    expect(screen.getAllByText(/General Individual/i).length).toBeGreaterThan(0);

    // Preset selector is present
    expect(screen.getByText(/One-Click Evaluator Presets/i)).toBeDefined();

    // Personalization form is present
    expect(screen.getByText(/Personalization Calibration/i)).toBeDefined();
    expect(screen.getByText(/Primary Commuting Mode/i)).toBeDefined();
    expect(screen.getByText(/Daily Schedule & Commute Timings/i)).toBeDefined();
  });
});
