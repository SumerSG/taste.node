import { useState } from "react";
import { AuthModal } from "../components/AuthModal";
import { LogIn, UserPlus, Sparkles, UtensilsCrossed, ListOrdered } from "lucide-react";

interface Props {
  onGuestEnter?: () => void;
}

export function LandingView({ onGuestEnter }: Props) {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const openSignIn = () => {
    setAuthMode("signin");
    setShowAuth(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setShowAuth(true);
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
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
