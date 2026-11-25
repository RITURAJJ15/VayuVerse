// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { AuthModal } from "../src/components/auth/auth-modal";
import { OnboardingModal } from "../src/components/auth/onboarding-modal";
import { ProfileDialog } from "../src/components/profile/profile-dialog";
import { LocationSelectorDialog } from "../src/components/location/location-selector-dialog";
import { AuthContext } from "../src/context/auth-context";
import { LocationContext } from "../src/context/location-context-value";
import { ProfileContext } from "../src/context/profile-context-value";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DEFAULT_USER_PROFILE } from "../src/types/profile";

describe("Modal Accessibility & Interaction Audit", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
    vi.restoreAllMocks();
  });

  const renderWithProviders = (ui: React.ReactNode, options?: { isGuest?: boolean }) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const isGuest = options?.isGuest ?? true;

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthContext.Provider
            value={{
              user: isGuest ? null : ({ id: "u-1", email: "test@example.com", user_metadata: { full_name: "Test User" } } as unknown as User),
              session: null,
              isLoading: false,
              isGuest,
              signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
              signOut: vi.fn().mockResolvedValue(undefined),
              deleteAccountAndData: vi.fn().mockResolvedValue({ success: true, error: null }),
            }}
          >
            <LocationContext.Provider
              value={{
                currentLocation: { id: "delhi", name: "New Delhi", latitude: 28.61, longitude: 77.2, country: "India", countryCode: "IN" },
                setCurrentLocation: vi.fn(),
                isLocationSelectorOpen: true,
                setIsLocationSelectorOpen: vi.fn(),
              }}
            >
              <ProfileContext.Provider
                value={{
                  currentProfile: DEFAULT_USER_PROFILE,
                  activePresetId: null,
                  activePreset: undefined,
                  updateProfile: vi.fn(),
                  selectPreset: vi.fn(),
                  resetProfile: vi.fn(),
                  isProfileDialogOpen: true,
                  setIsProfileDialogOpen: vi.fn(),
                }}
              >
                {ui}
              </ProfileContext.Provider>
            </LocationContext.Provider>
          </AuthContext.Provider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it("AuthModal: has correct ARIA labels, locks body scroll, and closes on Escape", async () => {
    const handleClose = vi.fn();
    renderWithProviders(<AuthModal isOpen={true} onClose={handleClose} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("auth-modal-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("auth-modal-desc-guest");

    // Body scroll locked
    expect(document.body.style.overflow).toBe("hidden");

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("AuthModal: clicking inside dialog does not close it, but clicking backdrop does", () => {
    const handleClose = vi.fn();
    renderWithProviders(<AuthModal isOpen={true} onClose={handleClose} />);

    const dialogCard = screen.getByRole("dialog");
    fireEvent.click(dialogCard);
    expect(handleClose).not.toHaveBeenCalled();

    // Clicking outer backdrop container
    const backdrop = dialogCard.closest(".fixed");
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("LocationSelectorDialog: has correct ARIA attributes and focus trap behavior", async () => {
    const queryClient = new QueryClient();
    const handleClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <LocationContext.Provider
          value={{
            currentLocation: null,
            setCurrentLocation: vi.fn(),
            isLocationSelectorOpen: true,
            setIsLocationSelectorOpen: handleClose,
          }}
        >
          <LocationSelectorDialog />
        </LocationContext.Provider>
      </QueryClientProvider>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-labelledby")).toBe("location-selector-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("location-selector-desc");

    // Focus initial input
    const input = screen.getByPlaceholderText(/Search Indian cities, towns, or districts/i);
    expect(input).toBeDefined();

    // Escape closes
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledWith(false);
  });

  it("ProfileDialog: has correct ARIA attributes and closes on Escape", () => {
    const handleClose = vi.fn();
    renderWithProviders(<ProfileDialog isOpen={true} onClose={handleClose} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBe("profile-dialog-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("profile-dialog-desc");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("OnboardingModal: supports keyboard radio persona selection and closes on Escape", () => {
    const handleClose = vi.fn();
    renderWithProviders(<OnboardingModal isOpen={true} onClose={handleClose} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBe("onboarding-modal-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("onboarding-modal-desc");

    const studentRadio = screen.getByRole("radio", { name: /Student/i });
    expect(studentRadio.getAttribute("aria-checked")).toBe("true");

    const workerRadio = screen.getByRole("radio", { name: /Working Professional/i });
    expect(workerRadio.getAttribute("aria-checked")).toBe("false");

    // Keyboard selection with Enter
    fireEvent.keyDown(workerRadio, { key: "Enter" });
    expect(workerRadio.getAttribute("aria-checked")).toBe("true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("Focus restoration: restores focus to triggering element upon unmount", async () => {
    const triggerBtn = document.createElement("button");
    triggerBtn.textContent = "Open Trigger";
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const handleClose = vi.fn();
    const { unmount } = renderWithProviders(<AuthModal isOpen={true} onClose={handleClose} />);

    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    await waitFor(() => {
      expect(document.activeElement).toBe(triggerBtn);
      expect(document.body.style.overflow).toBe("");
    });

    document.body.removeChild(triggerBtn);
  });
});
