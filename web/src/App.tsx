import { useEffect, useState } from "react";
import type { TasteProfile, FeedData } from "./data/types";
import { loadProfile, saveProfile, loadFeed, saveFeed } from "./data/api";
import { Layout, type Tab } from "./components/Layout";
import { FeedView } from "./views/FeedView";
import { SearchView } from "./views/SearchView";
import { LibraryView } from "./views/LibraryView";
import { RankingView } from "./views/RankingView";

function App() {
  const [profile, setProfile] = useState<TasteProfile>(loadProfile);
  const [feed, setFeed] = useState<FeedData>(loadFeed);
  const [tab, setTab] = useState<Tab>("feed");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveFeed(feed);
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
