import { useEffect, useState, useRef, useCallback, Component, type ReactNode } from "react";
import type { TasteProfile, FeedData, Venue } from "./data/types";
import { loadProfile, saveProfile, loadFeed, saveFeed, setCurrentUserId } from "./data/api";
import { loadVenues, getVenueById } from "./data/venues";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { useAuthState, useAuthActions } from "./hooks/useAuth";
import { Layout, type Tab } from "./components/Layout";
import { AuthModal } from "./components/AuthModal";
import { FeedView } from "./views/FeedView";
import { SearchView } from "./views/SearchView";
import { ProfileView } from "./views/LibraryView";
import { RankingView } from "./views/RankingView";
import { VenuePage } from "./views/VenuePage";
import { LandingView } from "./views/LandingView";
import { UserProfileView } from "./views/UserProfileView";
import { FabOverlay } from "./components/FabOverlay";
import { SAMPLE_USERS } from "./data/mockData";
import { sampleUserProfileCacheClear } from "./data/mockData";

type NavEntry =
  | { view: "landing" }
  | { view: "feed" }
  | { view: "search" }
  | { view: "profile" }
  | { view: "ranking" }
  | { view: "venue"; venueId: string }
  | { view: "userProfile"; userId: string; userName: string };

const APP_VERSION = "v3.0.9"; // Bump on every deploy to bust browser cache

function clearOldCaches() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("taste.node.")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn("Cache clear failed:", e);
  }
}

function AppContent() {
  const { user, loading: authLoading } = useAuthState();

  // ─── Cache-busting: force reload when app version changes ───
  useEffect(() => {
    const stored = localStorage.getItem("taste.node.app.version");
    if (stored !== APP_VERSION) {
      localStorage.setItem("taste.node.app.version", APP_VERSION);
      clearOldCaches();
      if (stored) {
        // Hard reload to ensure browser fetches the new JS bundle
        window.location.reload();
      }
    }
  }, []);
  const { logout } = useAuthActions();
  const userId = user?.id ?? null;

  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAuth, setShowAuth] = useState(false);
  const [, setGuestMode] = useState(false);
  const [navStack, setNavStack] = useState<NavEntry[]>([
    { view: user ? "feed" : "landing" },
  ]);
  const skipPopstate = useRef(false);

  // Sync user id with storage layer so profiles are isolated per account
  useEffect(() => {
    setCurrentUserId(userId);
  }, [userId]);

  // Load venues + profile + feed on mount (user-scoped state reset happens via key on wrapper)
  useEffect(() => {
    let cancelled = false;
    sampleUserProfileCacheClear(); // bust stale generator cache on every boot
    loadVenues().then(async () => {
      if (cancelled) return;
      const [p, f] = await Promise.all([loadProfile(), loadFeed()]);
      if (cancelled) return;
      setProfile(p);
      setFeed(f);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (profile) saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (feed) saveFeed(feed);
  }, [feed]);

  // Listen for browser back button (popstate)
  useEffect(() => {
    const handler = (_e: PopStateEvent) => {
      if (skipPopstate.current) {
        skipPopstate.current = false;
        return;
      }
      setNavStack((prev) => {
        if (prev.length <= 1) return prev;
        return prev.slice(0, -1);
      });
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const pushNav = useCallback((entry: NavEntry) => {
    setNavStack((prev) => [...prev, entry]);
    window.history.pushState(null, "", "");
  }, []);

  const popNav = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length <= 1) return prev;
      skipPopstate.current = true;
      window.history.back();
      return prev.slice(0, -1);
    });
  }, []);

  const handleProfileChange = (p: TasteProfile) => {
    setProfile(p);
  };

  const handleFeedChange = (f: FeedData) => {
    setFeed(f);
  };

  const handleTabChange = useCallback((t: Tab) => {
    setNavStack([{ view: t }]);
    setTab(t);
  }, []);

  const handleGlobalSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setNavStack([{ view: "search" }]);
    setTab("search");
  }, []);

  const navigateToVenue = useCallback(
    (venue: Venue) => {
      pushNav({ view: "venue", venueId: venue.id });
    },
    [pushNav]
  );

  const navigateToProfile = useCallback(
    (userIdArg: string, userNameArg: string) => {
      const name =
        userNameArg || SAMPLE_USERS.find((u) => u.id === userIdArg)?.name || "";
      pushNav({ view: "userProfile", userId: userIdArg, userName: name });
    },
    [pushNav]
  );

  const resolveUserProfileName = useCallback((uid: string) => {
    return SAMPLE_USERS.find((u) => u.id === uid)?.name || "";
  }, []);

  if (!ready || !profile || !feed || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sienna-500 border-t-transparent" />
          <p className="text-sm font-medium text-ink-muted">
            {authLoading ? "Checking session…" : "Loading restaurants…"}
          </p>
        </div>
      </div>
    );
  }

  const current = navStack[navStack.length - 1];

  if (current.view === "landing") {
    return (
      <LandingView
        onGuestEnter={() => {
          setGuestMode(true);
          setNavStack([{ view: "feed" }]);
        }}
      />
    );
  }

  const currentVenue =
    current.view === "venue" ? getVenueById(current.venueId) : null;

  return (
    <>
      <Layout
        profile={profile}
        activeTab={tab}
        onTabChange={handleTabChange}
        onGlobalSearch={handleGlobalSearch}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onLogout={logout}
      >
        {current.view === "userProfile" ? (
          <UserProfileView
            userId={current.userId}
            userName={current.userName}
            onNavigateToVenue={navigateToVenue}
            onNavigateToProfile={(uid) => {
              const name = resolveUserProfileName(uid);
              pushNav({ view: "userProfile", userId: uid, userName: name });
            }}
            onBack={popNav}
          />
        ) : current.view === "venue" ? (
          currentVenue ? (
            <VenuePage
              venue={currentVenue}
              profile={profile}
              feed={feed}
              onProfileChange={handleProfileChange}
              onBack={popNav}
              onNavigateToProfile={navigateToProfile}
            />
          ) : (
            <div className="mx-auto max-w-3xl py-20 text-center">
              <p className="text-ink-muted">Venue not found</p>
              <button onClick={popNav} className="btn-primary mt-4">
                Go back
              </button>
            </div>
          )
        ) : (
          <>
            {current.view === "feed" && (
              <FeedView
                profile={profile}
                onProfileChange={handleProfileChange}
                feed={feed}
                onFeedChange={handleFeedChange}
                onNavigateToSearch={() => {
                  setNavStack([{ view: "search" }]);
                  setTab("search");
                }}
                onNavigateToVenue={navigateToVenue}
                onNavigateToProfile={navigateToProfile}
              />
            )}
            {current.view === "search" && (
              <SearchView
                key={searchQuery}
                profile={profile}
                onProfileChange={handleProfileChange}
                initialQuery={searchQuery}
                onNavigateToVenue={navigateToVenue}
              />
            )}
            {current.view === "profile" && (
              <ProfileView
                profile={profile}
                onProfileChange={handleProfileChange}
                onNavigateToVenue={navigateToVenue}
                onNavigateToProfile={navigateToProfile}
              />
            )}
            {current.view === "ranking" && (
              <RankingView
                profile={profile}
                onProfileChange={handleProfileChange}
                onNavigateToSearch={() => {
                  setNavStack([{ view: "search" }]);
                  setTab("search");
                }}
                onNavigateToVenue={navigateToVenue}
              />
            )}
          </>
        )}
      </Layout>

      <FabOverlay
        profile={profile}
        onProfileChange={handleProfileChange}
        feed={feed}
        onFeedChange={handleFeedChange}
        onNavigateToSearch={() => {
          setNavStack([{ view: "search" }]);
          setTab("search");
        }}
      />

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

/* ─── Error Boundary to catch render crashes ─── */

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-cream p-8 text-center">
          <h1 className="mb-4 text-xl font-bold text-red-600">Something went wrong</h1>
          <pre className="max-w-xl overflow-auto rounded-lg bg-red-50 p-4 text-left text-xs text-red-800">
            {this.state.error?.stack || this.state.error?.message || "Unknown error"}
          </pre>
          <p className="mt-4 text-sm text-ink-muted">Please open the browser console (F12) and share the error details.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-sienna-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sienna-600"
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthKeyWrapper />
      </ToastProvider>
    </AuthProvider>
  );
}

function AuthKeyWrapper() {
  const { user } = useAuthState();
  return (
    <ErrorBoundary>
      <AppContent key={user?.id ?? "anon"} />
    </ErrorBoundary>
  );
}

export default App;
