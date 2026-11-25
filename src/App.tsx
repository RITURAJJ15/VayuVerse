import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationProvider } from "@/context/location-context";
import { ProfileProvider } from "@/context/profile-context";
import { AuthProvider } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { PageShell } from "@/components/layout/page-shell";
import { LandingPage } from "@/pages/landing";
import { OnboardingPage } from "@/pages/onboarding";
import { OverviewDashboardPage } from "@/pages/dashboard";
import { MyDayPlannerPage } from "@/pages/my-day";
import { DecisionLabPage } from "@/pages/decision-lab";
import { IndoorAirPage } from "@/pages/indoor-air";
import { ImpactTrackerPage } from "@/pages/impact";
import { ProfileSettingsPage } from "@/pages/profile";
import { SourcesMethodologyPage } from "@/pages/methodology";
import { NotFoundPage } from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <ProfileProvider>
            <BrowserRouter>
              <Routes>
                {/* 1. Public Landing Page at root / */}
                <Route path="/" element={<LandingPage />} />

                {/* 2. First-Time Guided Onboarding Flow */}
                <Route path="/onboarding" element={<OnboardingPage />} />

                {/* 3. Public Methodology accessible to all */}
                <Route path="/methodology" element={<SourcesMethodologyPage />} />
                <Route path="/sources" element={<Navigate to="/methodology" replace />} />

                {/* 4. Authenticated Application Pages Protected by Auth Gate */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<PageShell />}>
                    <Route path="dashboard" element={<OverviewDashboardPage />} />
                    <Route path="my-day" element={<MyDayPlannerPage />} />
                    <Route path="decision-lab" element={<DecisionLabPage />} />
                    <Route path="indoor-air" element={<IndoorAirPage />} />
                    <Route path="impact" element={<ImpactTrackerPage />} />
                    <Route path="profile" element={<ProfileSettingsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </ProfileProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
