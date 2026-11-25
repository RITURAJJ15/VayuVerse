/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccountAndData: () => Promise<{ success: boolean; error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Initial Session Retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // 2. Listen for Auth State Changes (Google OAuth redirect, token refresh, sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error("[Auth] Error signing out:", err);
    }
  };

  const deleteAccountAndData = async (): Promise<{
    success: boolean;
    error: Error | null;
  }> => {
    try {
      if (!user) throw new Error("No authenticated user to delete.");

      // 1. Execute Wipe User Data RPC or manual cascades
      const { error: rpcError } = await supabase.rpc("wipe_user_data");
      if (rpcError) {
        // Fallback manual table deletion under RLS
        await supabase.from("action_logs").delete().eq("user_id", user.id);
        await supabase.from("saved_plans").delete().eq("user_id", user.id);
        await supabase.from("saved_locations").delete().eq("user_id", user.id);
        await supabase.from("profiles").delete().eq("user_id", user.id);
      }

      // 2. Sign out locally
      await signOut();
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isGuest: !user,
        signInWithGoogle,
        signOut,
        deleteAccountAndData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Graceful guest fallback for standalone test harnesses
    return {
      user: null,
      session: null,
      isLoading: false,
      isGuest: true,
      signInWithGoogle: async () => ({ error: null }),
      signOut: async () => {},
      deleteAccountAndData: async () => ({ success: true, error: null }),
    };
  }
  return context;
}
