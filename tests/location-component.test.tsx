// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationContext } from "../src/context/location-context-value";
import { LocationSelectorDialog } from "../src/components/location/location-selector-dialog";
import { POPULAR_INDIAN_CITIES, type GeoLocation } from "../src/types/location";

describe("LocationSelectorDialog Component", () => {
  afterEach(() => {
    cleanup();
  });

  const createWrapper = (
    currentLoc: GeoLocation | null = POPULAR_INDIAN_CITIES[0]!,
    isOpen = true,
    setCurrentLocation = vi.fn(),
    setIsOpen = vi.fn()
  ) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return {
      queryClient,
      setCurrentLocation,
      setIsOpen,
      rendered: render(
        <QueryClientProvider client={queryClient}>
          <LocationContext.Provider
            value={{
              currentLocation: currentLoc,
              setCurrentLocation,
              isLocationSelectorOpen: isOpen,
              setIsLocationSelectorOpen: setIsOpen,
            }}
          >
            <LocationSelectorDialog />
          </LocationContext.Provider>
        </QueryClientProvider>
      ),
    };
  };

  it("does not render when isLocationSelectorOpen is false", () => {
    createWrapper(null, false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders search input, popular city shortcuts, and active city badge", () => {
    createWrapper(POPULAR_INDIAN_CITIES[0]!, true);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(
      screen.getByPlaceholderText(/Search Indian cities, towns, or districts/i)
    ).toBeDefined();
    expect(screen.getByText(/Use my current location \(GPS\)/i)).toBeDefined();
    expect(screen.getByText(/Popular Indian Monitoring Hubs/i)).toBeDefined();
    expect(screen.getByText(/Mumbai/i)).toBeDefined();
    expect(screen.getByText(/Bengaluru/i)).toBeDefined();
  });

  it("triggers setCurrentLocation and closes dialog when a shortcut is clicked", () => {
    const setCurrentLocation = vi.fn();
    const setIsOpen = vi.fn();
    createWrapper(null, true, setCurrentLocation, setIsOpen);

    // Click on "Mumbai"
    const mumbaiButton = screen.getByText(/Mumbai/i).closest("button")!;
    fireEvent.click(mumbaiButton);

    expect(setCurrentLocation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Mumbai", state: "Maharashtra" })
    );
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it("closes dialog when close button is clicked", () => {
    const setIsOpen = vi.fn();
    createWrapper(null, true, vi.fn(), setIsOpen);

    const closeBtn = screen.getByRole("button", { name: /Close dialog/i });
    fireEvent.click(closeBtn);

    expect(setIsOpen).toHaveBeenCalledWith(false);
  });
});
