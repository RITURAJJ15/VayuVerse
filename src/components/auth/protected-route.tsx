import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { useLocationState } from "@/context/location-context";
import { BotanicalLoadingScreen } from "@/components/ui/botanical-loading-screen";

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { currentLocation, isLocationLoading } = useLocationState();
  const location = useLocation();

  // 1. Authentication check in progress
  if (isAuthLoading) {
    return (
      <BotanicalLoadingScreen
        message="Checking atmospheric credentials..."
        subMessage="Securing your personal environmental session"
      />
    );
  }

  // 2. Unauthenticated visitor: redirect to public landing page with trigger to open AuthModal
  if (!user) {
    return (
      <Navigate
        to="/"
        state={{ openAuth: true, returnTo: location.pathname }}
        replace
      />
    );
  }

  // 3. User is signed in, but location restoration from Supabase is still resolving
  if (isLocationLoading) {
    return (
      <BotanicalLoadingScreen
        message="Restoring saved atmospheric profile..."
        subMessage="Connecting to your validated municipal monitoring stations"
      />
    );
  }

  // 4. Authenticated, but has never onboarded or selected a location: redirect to onboarding
  if (!currentLocation) {
    return <Navigate to="/onboarding" replace />;
  }

  // 5. Authorized and ready
  return children ? <>{children}</> : <Outlet />;
}
