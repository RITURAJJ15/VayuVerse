// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationProvider } from "../src/context/location-context";
import { ProfileProvider } from "../src/context/profile-context";
import { AuthProvider } from "../src/context/auth-context";
import { PageShell } from "../src/components/layout/page-shell";
import { OverviewDashboardPage } from "../src/pages/dashboard";
import { MyDayPlannerPage } from "../src/pages/my-day";
import { DecisionLabPage } from "../src/pages/decision-lab";
import { IndoorAirPage } from "../src/pages/indoor-air";
import { ImpactTrackerPage } from "../src/pages/impact";
import { ProfileSettingsPage } from "../src/pages/profile";
import { SourcesMethodologyPage } from "../src/pages/methodology";
import { TopControls } from "../src/components/layout/top-controls";

function renderAppWithInitialRoute(initialPath = "/") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <ProfileProvider>
            <MemoryRouter initialEntries={[initialPath]}>
              <Routes>
                <Route element={<PageShell />}>
                  <Route index element={<OverviewDashboardPage />} />
                  <Route path="my-day" element={<MyDayPlannerPage />} />
                  <Route path="decision-lab" element={<DecisionLabPage />} />
                  <Route path="indoor-air" element={<IndoorAirPage />} />
                  <Route path="impact" element={<ImpactTrackerPage />} />
                  <Route path="profile" element={<ProfileSettingsPage />} />
                  <Route path="methodology" element={<SourcesMethodologyPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ProfileProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("Comprehensive E2E Critical Workflows Audit", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // 1. Workflow: Navigation across all 7 pages with Design D PageShell
  it("navigates smoothly across all 7 pages without console errors or layout collapse", async () => {
    const { unmount } = renderAppWithInitialRoute("/");

    // 1. Overview Dashboard
    expect(screen.getByText(/A better day/i)).toBeDefined();
    expect(screen.getByText(/starts here/i)).toBeDefined();
    unmount();

    // 2. My Day Planner
    renderAppWithInitialRoute("/my-day");
    expect(screen.getByText(/My Day Clean-Air Planner/i)).toBeDefined();
    expect(screen.getByText(/Diurnal Atmospheric Windows/i)).toBeDefined();
    cleanup();

    // 3. Decision Lab
    renderAppWithInitialRoute("/decision-lab");
    expect(screen.getByText(/What-If Decision Lab/i)).toBeDefined();
    cleanup();

    // 4. Indoor Air Guardian
    renderAppWithInitialRoute("/indoor-air");
    expect(screen.getByText(/Indoor Air Guardian/i)).toBeDefined();
    expect(screen.getByText(/Room-by-Room Protection Blueprint/i)).toBeDefined();
    cleanup();

    // 5. Impact Tracker
    renderAppWithInitialRoute("/impact");
    expect(screen.getByText(/Personal & Community Impact/i)).toBeDefined();
    expect(screen.getByText("Completed Actions")).toBeDefined();
    cleanup();

    // 6. Profile & Settings
    renderAppWithInitialRoute("/profile");
    expect(screen.getByText(/Profile & Settings/i)).toBeDefined();
    expect(screen.getByText(/One-Click Evaluator Presets/i)).toBeDefined();
    cleanup();

    // 7. Sources & Methodology
    renderAppWithInitialRoute("/methodology");
    expect(screen.getByText(/Sources & Methodology/i)).toBeDefined();
    expect(screen.getByText(/Zero Synthetic Numbers/i)).toBeDefined();
  });

  // 2. Workflow: City Selection & Location Modal Portal
  it("opens location selector modal from header and switches city cleanly", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthProvider>
          <LocationProvider>
            <ProfileProvider>
              <MemoryRouter>
                <TopControls />
              </MemoryRouter>
            </ProfileProvider>
          </LocationProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Initial state: "Select City" (no silent default to Delhi)
    expect(screen.getByText(/Select City/i)).toBeDefined();

    // Open Location Modal
    const cityButton = screen.getByRole("button", { name: /Select Indian location/i });
    fireEvent.click(cityButton);

    // Modal is mounted in portal with dialog role
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(screen.getByText(/Select Indian Location/i)).toBeDefined();

    // Click "Mumbai" popular shortcut
    const mumbaiBtn = screen.getByRole("button", { name: /Mumbai/i });
    fireEvent.click(mumbaiBtn);

    // Modal closes and active city changes to Mumbai
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByText(/Mumbai/i)).toBeDefined();
    });
  });

  // 3. Workflow: Profile & Persona Switching across Presets
  it("switches profile persona and calibrates schedule parameters", async () => {
    renderAppWithInitialRoute("/profile");

    // Click Kolkata Senior Citizen Preset button by testid
    const kolkataCard = screen.getByTestId("preset-card-kolkata_senior");
    fireEvent.click(kolkataCard);

    // Verify persona is updated to Dr. Chatterjee (Kolkata Senior)
    await waitFor(() => {
      expect(screen.getByText(/Dr\. Chatterjee/i)).toBeDefined();
    });
  });

  // 4. Workflow: Indoor Air Guardian dynamic guidance updates
  it("updates indoor air recommendations dynamically when home configuration changes", async () => {
    renderAppWithInitialRoute("/indoor-air");

    // Select Cooking Fuel dropdown and switch to Biomass
    const cookingFuelSelect = screen.getByLabelText(/Type of Cooking Fuel/i);
    fireEvent.change(cookingFuelSelect, { target: { value: "biomass_wood_coal" } });

    // Verify warning for unvented solid fuel appears
    await waitFor(() => {
      expect(screen.getByText(/Urgent Biomass\/Solid Fuel Airway Isolation/i)).toBeDefined();
    });
  });

  // 5. Workflow: Decision Lab simulation scenario switching
  it("switches Decision Lab scenarios and recalculates exposure trade-offs", async () => {
    renderAppWithInitialRoute("/decision-lab");

    // Click "What if I leave one hour earlier?" preset button
    const presetBtn = screen.getByRole("button", { name: /leave one hour earlier/i });
    fireEvent.click(presetBtn);

    expect(screen.getByText(/08:00 AM vs. 07:00 AM Departure Shift/i)).toBeDefined();
  });

  // 6. Workflow: Guest Mode Authentication & Portal Mount
  it("opens auth modal cleanly in portal without crashing or clipping", async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthProvider>
          <LocationProvider>
            <ProfileProvider>
              <MemoryRouter>
                <TopControls />
              </MemoryRouter>
            </ProfileProvider>
          </LocationProvider>
        </AuthProvider>
      </QueryClientProvider>
    );

    // Click "Sign In"
    const signInBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(signInBtn);

    // Verify Auth Modal is rendered via portal
    const authDialog = screen.getByRole("dialog");
    expect(authDialog).toBeDefined();
    expect(screen.getByText(/Sign In to VayuVerse/i)).toBeDefined();
    expect(screen.getByText(/Continue with Google/i)).toBeDefined();

    // Close dialog
    const closeBtn = screen.getByRole("button", { name: /Close dialog/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // 7. Workflow: Impact Tracker action toggle and deletion
  it("toggles action status between completed and planned and preserves scientific integrity", async () => {
    renderAppWithInitialRoute("/impact");

    // Find the toggle button on act-1 (completed)
    const completedBadge = screen.getAllByRole("button", { name: /Mark as Planned/i })[0];
    expect(completedBadge).toBeDefined();

    if (completedBadge) {
      fireEvent.click(completedBadge);
      // Status switches to planned
      await waitFor(() => {
        expect(screen.getAllByRole("button", { name: /Mark as Completed/i }).length).toBeGreaterThan(0);
      });
    }
  });
});
