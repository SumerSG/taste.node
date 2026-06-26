import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser, signInWithPassword, signUp, signInWithGoogle, signOut, onAuthStateChange } from "../lib/supabase";
import { AuthStateContext, AuthActionsContext } from "./AuthContext.defs";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clean auth callback fragments from URL so refreshing doesn't re-trigger
    // the OAuth exchange and cause loops.
    const cleanUrl = () => {
      const u = new URL(window.location.href);
      const hasAuthParams = u.hash.includes("access_token") || u.searchParams.has("code");
      if (hasAuthParams) {
        u.hash = "";
        ["access_token", "refresh_token", "expires_in", "token_type", "provider_token", "type", "code"].forEach(
          (k) => u.searchParams.delete(k)
        );
        window.history.replaceState({}, "", u.toString());
      }
    };
    cleanUrl();

    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

    const { data } = onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signUp(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      setError(message);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign in failed";
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign out failed";
      setError(message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthStateContext.Provider value={{ user, loading, error }}>
      <AuthActionsContext.Provider value={{ login, register, loginWithGoogle, logout, clearError }}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}
