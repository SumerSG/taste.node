import { useState } from "react";
import { AuthModal } from "../components/AuthModal";
import { LogIn, UserPlus, Sparkles, UtensilsCrossed, ListOrdered } from "lucide-react";
import { useAuthActions } from "../hooks/useAuth";

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.05 5.05 0 01-2.19 3.31v2.77h3.55c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.77c-.98.66-2.23 1.06-3.73 1.06-2.87 0-5.3-1.94-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.86-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

interface Props {
  onGuestEnter?: () => void;
}

export function LandingView({ onGuestEnter }: Props) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const { loginWithGoogle } = useAuthActions();
  const [googleBusy, setGoogleBusy] = useState(false);

  const openSignIn = () => {
    setAuthMode("signin");
    setShowAuth(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setShowAuth(true);
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    try {
      await loginWithGoogle();
    } catch {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-sienna-100 opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full bg-olive-100 opacity-50 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sienna-500 text-white shadow-lg">
              <span className="font-serif text-2xl leading-none">t</span>
            </div>
            <h1 className="font-serif text-3xl tracking-tight text-ink sm:text-4xl">taste.node</h1>
          </div>

          {/* Tagline */}
          <h2 className="mx-auto max-w-xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Your taste, <span className="text-sienna-600">ranked.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
            Build ranked lists of your favourite restaurants and cafés. Discover places through people who eat like you.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3">
            <button
              onClick={handleGoogle}
              disabled={googleBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cream-dark bg-paper px-8 py-3 text-base font-medium text-ink shadow-sm transition hover:bg-cream disabled:opacity-60 sm:w-auto"
            >
              {googleBusy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-sienna-500 border-t-transparent" />
              ) : (
                <GoogleIcon />
              )}
              {googleBusy ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="h-px flex-1 bg-cream-dark" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">or</span>
              <div className="h-px flex-1 bg-cream-dark" />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:w-auto">
              <button
                onClick={openSignUp}
                className="btn-primary w-full gap-2 px-8 py-3 text-base shadow-lg sm:w-auto"
              >
                <UserPlus size={18} /> Create account
              </button>
              <button
                onClick={openSignIn}
                className="btn-secondary w-full gap-2 px-8 py-3 text-base sm:w-auto"
              >
                <LogIn size={18} /> Sign in
              </button>
            </div>
          </div>

          {onGuestEnter && (
            <button
              onClick={onGuestEnter}
              className="mt-4 text-sm text-ink-faint underline underline-offset-2 transition hover:text-sienna-600"
            >
              Continue as guest
            </button>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="taste-card space-y-3 rounded-2xl border border-cream-dark bg-paper p-6 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sienna-50 text-sienna-600">
              <ListOrdered size={22} />
            </div>
            <h3 className="font-serif text-lg text-ink">Rank what you love</h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              Drag and drop to build your personal top list. Separate lists for date nights, cafés, noodle spots — whatever your palate demands.
            </p>
          </div>

          <div className="taste-card space-y-3 rounded-2xl border border-cream-dark bg-paper p-6 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-olive-50 text-olive-600">
              <Sparkles size={22} />
            </div>
            <h3 className="font-serif text-lg text-ink">Taste clusters</h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              We group you with people who rank similarly. See what your cluster is loving — not what algorithms are pushing.
            </p>
          </div>

          <div className="taste-card space-y-3 rounded-2xl border border-cream-dark bg-paper p-6 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sienna-50 text-sienna-600">
              <UtensilsCrossed size={22} />
            </div>
            <h3 className="font-serif text-lg text-ink">Follow food people</h3>
            <p className="text-sm leading-relaxed text-ink-muted">
              Follow friends and local regulars. Their recommendations surface first — no stars, just trusted taste.
            </p>
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-14 text-center">
          <p className="text-sm font-medium text-ink-muted">
            Built during a 6-week internship exploring taste-based AI clustering.
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            No scraping. Public API data only. Your rankings are yours.
          </p>
        </div>
      </div>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} initialMode={authMode} />
    </div>
  );
}
