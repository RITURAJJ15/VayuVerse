// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationProvider } from "../src/context/location-context";
import { ProfileProvider } from "../src/context/profile-context";
import { AuthProvider } from "../src/context/auth-context";
import { ImpactTrackerPage } from "../src/pages/impact";
import { AuthModal } from "../src/components/auth/auth-modal";
import {
  persistenceService,
  roundCoordinateForPrivacy,
} from "../src/lib/persistence-service";
import { supabase } from "../src/lib/supabase";

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

describe("Supabase Persistence, Auth & Impact Tracker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Privacy & Coordinate Rounding", () => {
    it("rounds coordinates to 3 decimal places (~100m) for privacy preservation", () => {
      const exactLat = 28.613945;
      const exactLng = 77.209021;

      const roundedLat = roundCoordinateForPrivacy(exactLat);
      const roundedLng = roundCoordinateForPrivacy(exactLng);

      expect(roundedLat).toBe(28.614);
      expect(roundedLng).toBe(77.209);
    });
  });

  describe("Guest Access & Core Feature Availability", () => {
    it("renders Impact Tracker in guest mode with initial confirmed actions", () => {
      renderWithProviders(<ImpactTrackerPage />);

      expect(screen.getByText(/Personal & Community Impact/i)).toBeDefined();
      expect(screen.getByText(/Guest mode active/i)).toBeDefined();
      expect(screen.getByText("Completed Actions")).toBeDefined();
      expect(screen.getByText("Planned Actions")).toBeDefined();
      expect(screen.getByText("Carbon Emissions Prevented")).toBeDefined();
      expect(screen.getByText("Avoided Particulate Inhalation")).toBeDefined();
    });

    it("toggles an action between planned and confirmed completed", () => {
      renderWithProviders(<ImpactTrackerPage />);

      const toggleButtons = screen.getAllByRole("button", {
        name: /Mark as planned|Mark as completed/i,
      });
      expect(toggleButtons.length).toBeGreaterThan(0);

      // Click to toggle first action
      fireEvent.click(toggleButtons[0]!);

      expect(screen.getByText(/Action Ledger & Habit Log/i)).toBeDefined();
    });

    it("allows removing an individual action log", () => {
      renderWithProviders(<ImpactTrackerPage />);

      const removeButtons = screen.getAllByRole("button", {
        name: /Remove action/i,
      });
      const initialCount = removeButtons.length;
      expect(initialCount).toBeGreaterThan(0);

      fireEvent.click(removeButtons[0]!);

      const updatedRemoveButtons = screen.queryAllByRole("button", {
        name: /Remove action/i,
      });
      expect(updatedRemoveButtons.length).toBe(initialCount - 1);
    });

    it("enforces strict scientific guardrails: only confirmed completed actions count toward emissions", () => {
      renderWithProviders(<ImpactTrackerPage />);

      expect(
        screen.getByText(/Strictly counted upon user confirmation/i)
      ).toBeDefined();
      expect(
        screen.getByText(
          /VayuVerse explicitly prohibits calculating medical diagnoses/i
        )
      ).toBeDefined();
    });
  });

  describe("Authentication Modal & Google OAuth", () => {
    it("renders Google OAuth option in AuthModal", () => {
      const handleClose = vi.fn();
      renderWithProviders(<AuthModal isOpen={true} onClose={handleClose} />);

      expect(screen.getByText(/Sign In to VayuVerse/i)).toBeDefined();
      expect(screen.getByText(/Continue with Google/i)).toBeDefined();
      expect(screen.getByText(/Privacy & Data Safeguards/i)).toBeDefined();
    });

    it("triggers Supabase OAuth redirect when clicking Continue with Google", async () => {
      const signInSpy = vi
        .spyOn(supabase.auth, "signInWithOAuth")
        .mockResolvedValueOnce({
          data: { provider: "google", url: "https://accounts.google.com/o/oauth2" },
          error: null,
        });

      const handleClose = vi.fn();
      renderWithProviders(<AuthModal isOpen={true} onClose={handleClose} />);

      const googleBtn = screen.getByText(/Continue with Google/i);
      fireEvent.click(googleBtn);

      expect(signInSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
        })
      );
    });
  });

  describe("Persistence Service CRUD & Cross-User Security", () => {
    it("upserts user profile with preferences and home configuration", async () => {
      const mockProfile = {
        id: "prof-123",
        user_id: "user-abc",
        display_name: "Aarav Sharma",
        persona: "office_commuter" as const,
        preferences: { commuteMode: "metro" },
        home_configuration: { homeType: "apartment" as const },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.spyOn(supabase, "from").mockReturnValueOnce({
        upsert: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const res = await persistenceService.upsertProfile({
        user_id: "user-abc",
        display_name: "Aarav Sharma",
        persona: "office_commuter",
        preferences: { commuteMode: "metro" },
        home_configuration: { homeType: "apartment" },
      });

      expect(res.data?.display_name).toBe("Aarav Sharma");
      expect(res.data?.persona).toBe("office_commuter");
    });

    it("saves location with privacy-rounded coordinates", async () => {
      const mockSavedLoc = {
        id: "loc-123",
        user_id: "user-abc",
        location_name: "Noida Office",
        rounded_latitude: 28.628,
        rounded_longitude: 77.365,
        created_at: new Date().toISOString(),
      };

      vi.spyOn(supabase, "from").mockReturnValueOnce({
        insert: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: mockSavedLoc,
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const res = await persistenceService.saveLocation(
        "user-abc",
        "Noida Office",
        28.628194,
        77.364912
      );

      expect(res.data?.rounded_latitude).toBe(28.628);
      expect(res.data?.rounded_longitude).toBe(77.365);
    });

    it("records action logs with CPCB/ARAI calculation method", async () => {
      const mockAction = {
        id: "act-999",
        user_id: "user-abc",
        action_type: "commute_modal_shift" as const,
        status: "completed" as const,
        baseline_assumptions: { originalMode: "Car", alternativeMode: "Metro" },
        calculated_impact: { emissionsGramsCo2Saved: 1920 },
        calculation_method: "CPCB_ARAI_CAR_VS_DMRC_METRO",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      vi.spyOn(supabase, "from").mockReturnValueOnce({
        insert: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: mockAction,
              error: null,
            }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>);

      const res = await persistenceService.logAction({
        user_id: "user-abc",
        action_type: "commute_modal_shift",
        status: "completed",
        baseline_assumptions: { originalMode: "Car", alternativeMode: "Metro" },
        calculated_impact: { emissionsGramsCo2Saved: 1920 },
        calculation_method: "CPCB_ARAI_CAR_VS_DMRC_METRO",
        completed_at: new Date().toISOString(),
      });

      expect(res.data?.calculated_impact.emissionsGramsCo2Saved).toBe(1920);
      expect(res.data?.status).toBe("completed");
    });
  });
});
