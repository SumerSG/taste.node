import { useEffect, useState } from "react";
import type { TasteProfile, FeedData, Venue } from "./data/types";
import { loadProfile, saveProfile, loadFeed, saveFeed, setCurrentUserId } from "./data/api";
import { loadVenues } from "./data/venues";
import { AuthProvider } from "./context/AuthContext";
import { useAuthState, useAuthActions } from "./hooks/useAuth";
import { Layout, type Tab } from "./components/Layout";
import { AuthModal } from "./components/AuthModal";
import { FeedView } from "./views/FeedView";
import { SearchView } from "./views/SearchView";
import { ProfileView } from "./views/LibraryView";
import { RankingView } from "./views/RankingView";
import { VenuePage } from "./views/VenuePage";
import { LandingView } from "./views/LandingView";

function AppContent() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAuth, setShowAuth] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const { user, loading: authLoading } = useAuthState();
  const { logout } = useAuthActions();
  const userId = user?.id ?? null;

  // Sync user id with storage layer so profiles are isolated per account
  useEffect(() => {
    setCurrentUserId(userId);
  }, [userId]);

  // Load venues + profile + feed on mount (user-scoped state reset happens via key on wrapper)
  useEffect(() => {
    let cancelled = false;
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

  const handleProfileChange = (p: TasteProfile) => {
    setProfile(p);
  };

  const handleFeedChange = (f: FeedData) => {
    setFeed(f);
  };

  const handleGlobalSearch = (q: string) => {
    setSearchQuery(q);
    setTab("search");
  };

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

  if (!user && !guestMode) {
    return (
      <LandingView
        onGuestEnter={() => setGuestMode(true)}
      />
    );
  }

  return (
    <>
      <Layout
        profile={profile}
        activeTab={tab}
        onTabChange={(t) => { setSelectedVenue(null); setTab(t); }}
        onGlobalSearch={handleGlobalSearch}
        user={user}
        onOpenAuth={() => setShowAuth(true)}
        onLogout={logout}
      >
        {selectedVenue ? (
          <VenuePage
            venue={selectedVenue}
            profile={profile}
            feed={feed}
            onProfileChange={handleProfileChange}
            onBack={() => setSelectedVenue(null)}
          />
        ) : (
          <>
            {tab === "feed" && (
              <FeedView
                profile={profile}
                onProfileChange={handleProfileChange}
                feed={feed}
                onFeedChange={handleFeedChange}
                onNavigateToSearch={() => setTab("search")}
                onNavigateToVenue={(v) => setSelectedVenue(v)}
              />
            )}
            {tab === "search" && (
              <SearchView
                key={searchQuery}
                profile={profile}
                onProfileChange={handleProfileChange}
                initialQuery={searchQuery}
                onNavigateToVenue={(v) => setSelectedVenue(v)}
              />
            )}
            {tab === "profile" && (
              <ProfileView
                profile={profile}
                onProfileChange={handleProfileChange}
              />
            )}
            {tab === "ranking" && (
              <RankingView
                profile={profile}
                onProfileChange={handleProfileChange}
                onNavigateToLibrary={() => setTab("search")}
              />
            )}
          </>
        )}
      </Layout>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthKeyWrapper />
    </AuthProvider>
  );
}

function AuthKeyWrapper() {
  const { user } = useAuthState();
  return <AppContent key={user?.id ?? 'anon'} />;
}

export default App;
