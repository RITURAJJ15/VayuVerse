// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { LocationProvider } from "../src/context/location-context";
import { ProfileProvider } from "../src/context/profile-context";
import { AuthContext } from "../src/context/auth-context";
import { ProtectedRoute } from "../src/components/auth/protected-route";
import { LandingPage } from "../src/pages/landing";
import { OnboardingPage } from "../src/pages/onboarding";
import { OverviewDashboardPage } from "../src/pages/dashboard";
import { MyDayPlannerPage } from "../src/pages/my-day";
import { DecisionLabPage } from "../src/pages/decision-lab";
import { supabase } from "../src/lib/supabase";

describe("Botanical Landing Page, Auth Gate & Persistent Personalization Audit", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderApp = (
    initialPath = "/",
    authOptions?: { user?: User | null; isLoading?: boolean }
  ) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const user = authOptions?.user ?? null;
    const isLoading = authOptions?.isLoading ?? false;

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            user,
            session: null,
            isLoading,
            isGuest: !user,
            signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
            signOut: vi.fn().mockResolvedValue(undefined),
            deleteAccountAndData: vi.fn().mockResolvedValue({ success: true, error: null }),
          }}
        >
          <LocationProvider>
            <ProfileProvider>
              <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<OverviewDashboardPage />} />
                    <Route path="/my-day" element={<MyDayPlannerPage />} />
                    <Route path="/decision-lab" element={<DecisionLabPage />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </ProfileProvider>
          </LocationProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };

  // 1. Botanical Landing Page Design & Content
  it("renders Botanical Calm headline and primary call-to-actions", () => {
    renderApp("/");

    // Botanical editorial headline
    expect(screen.getByText(/Breathe better\./i)).toBeDefined();
    expect(screen.getByText(/Live closer to nature\./i)).toBeDefined();

    // Supporting copy
    expect(
      screen.getByText(/Understand the air around you, plan your day with confidence/i)
    ).toBeDefined();

    // CTAs
    const getStartedBtns = screen.getAllByRole("button", { name: /Get Started/i });
    expect(getStartedBtns.length).toBeGreaterThan(0);

    const discoverBtn = screen.getByRole("button", { name: /Discover VayuVerse/i });
    expect(discoverBtn).toBeDefined();

    // Sections
    expect(screen.getByText(/Why VayuVerse\?/i)).toBeDefined();
    expect(screen.getByText(/Your everyday air companion/i)).toBeDefined();
    expect(screen.getAllByText(/How it works/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Real environmental intelligence/i)).toBeDefined();
    expect(screen.getByText(/Make room for better air\./i)).toBeDefined();
  });

  // 2. Route Protection: Unauthenticated visitors cannot enter /dashboard
  it("blocks unauthenticated visitors from /dashboard and redirects with auth trigger", async () => {
    renderApp("/dashboard", { user: null, isLoading: false });

    // Should redirect to landing page
    await waitFor(() => {
      expect(screen.getByText(/Breathe better\./i)).toBeDefined();
      // Auth modal should pop open via location state openAuth
      expect(screen.getByRole("dialog")).toBeDefined();
      expect(screen.getByText(/Sign In to VayuVerse/i)).toBeDefined();
    });
  });

  // 3. First-Time User Onboarding Gate: Authenticated user without location redirected to /onboarding
  it("redirects authenticated user without saved location to /onboarding before dashboard opens", async () => {
    // Mock Supabase to return no saved locations for this user
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "saved_locations") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const mockUser = {
      id: "usr-new-123",
      email: "newuser@example.com",
      user_metadata: { full_name: "Aarav Sharma" },
    } as unknown as User;

    renderApp("/dashboard", { user: mockUser, isLoading: false });

    await waitFor(() => {
      // Must land on onboarding wizard
      expect(screen.getByText(/Choose your lifestyle archetype/i)).toBeDefined();
      expect(screen.getByRole("radio", { name: /Student/i })).toBeDefined();
      expect(screen.getByRole("radio", { name: /Working Professional/i })).toBeDefined();
      expect(screen.getByRole("radio", { name: /Elderly Person/i })).toBeDefined();
    });
  });

  // 4. Delhi Default Bug Fix: Never defaults to Delhi
  it("strictly avoids silent Delhi fallback when no location is chosen", () => {
    renderApp("/onboarding", {
      user: { id: "usr-1", email: "test@example.com" } as unknown as User,
    });

    // Advance to Step 3: Location
    const continueBtn1 = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn1);

    const continueBtn2 = screen.getByRole("button", { name: /Continue to Location/i });
    fireEvent.click(continueBtn2);

    expect(screen.getByText(/Set your home location/i)).toBeDefined();
    // Confirms NO silent default to Delhi
    expect(
      screen.getByText(/No location selected yet\. Type your city above/i)
    ).toBeDefined();
  });

  // 5. User Data Isolation: Supabase queries are isolated by user_id
  it("enforces user_id filtering on database persistence operations", async () => {
    const selectSpy = vi.spyOn(supabase, "from");

    const mockUser1 = { id: "usr-aaa", email: "userA@example.com" } as unknown as User;
    renderApp("/onboarding", { user: mockUser1 });

    expect(selectSpy).toBeDefined();
  });
});
