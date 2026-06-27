import { createClient, type Session, type User } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const isPlaceholder =
  !url ||
  !key ||
  url.includes("your-project") ||
  key.includes("your-anon-key") ||
  key.includes("your-service-role-key");

export const supabase =
  !isPlaceholder
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function hasSupabase(): boolean {
  return !!supabase;
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error("Sign-in is not available in this mode. Browse as a guest or set up Supabase.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error("Sign-up is not available in this mode. Browse as a guest.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/** Build a stable redirect URL (uses full href so Supabase returns the user
 * to the exact same page). Falls back to HTTPS if running on an odd origin. */
function getCurrentRedirectUrl(): string {
  const href = window.location.href;
  // If href contains auth callback fragments/hashes, strip them
  try {
    const u = new URL(href);
    u.hash = "";
    // Also strip any existing Supabase auth query params that might linger
    const stripped = ["access_token", "refresh_token", "type", "error", "error_code", "error_description"];
    stripped.forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return href;
  }
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Google sign-in is not available in this mode. Browse as a guest.");
  const redirectTo = getCurrentRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
  if (data.url) window.location.href = data.url;
  return data;
}

export async function signOut() {
  if (!supabase) throw new Error("No active session to sign out from.");
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}
