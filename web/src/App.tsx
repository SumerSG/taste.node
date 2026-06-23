import { useEffect, useState } from "react";
import type { TasteProfile, FeedData } from "./data/types";
import { loadProfile, saveProfile, loadFeed, saveFeed } from "./data/api";
import { loadVenues, isVenuesLoaded } from "./data/venues";
import { Layout, type Tab } from "./components/Layout";
import { FeedView } from "./views/FeedView";
import { SearchView } from "./views/SearchView";
import { LibraryView } from "./views/LibraryView";
import { RankingView } from "./views/RankingView";

function App() {
  const [ready, setReady] = useState(isVenuesLoaded());
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (ready) return;
    loadVenues().then(() => {
      setProfile(loadProfile());
      setFeed(loadFeed());
      setReady(true);
    });
  }, [ready]);

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

  if (!ready || !profile || !feed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sienna-500 border-t-transparent" />
          <p className="text-sm font-medium text-ink-muted">Loading restaurants…</p>
        </div>
      </div>
    );
  }

  return (
    <Layout profile={profile} activeTab={tab} onTabChange={setTab} onGlobalSearch={handleGlobalSearch}>
      {tab === "feed" && (
        <FeedView
          feed={feed}
          onFeedChange={handleFeedChange}
          onNavigateToSearch={() => setTab("search")}
        />
      )}
      {tab === "search" && (
        <SearchView
          key={searchQuery}
          profile={profile}
          onProfileChange={handleProfileChange}
          initialQuery={searchQuery}
        />
      )}
      {tab === "library" && (
        <LibraryView
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
    </Layout>
  );
}

export default App;
