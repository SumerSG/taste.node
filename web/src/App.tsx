import { useEffect, useState } from "react";
import type { TasteProfile } from "./data/types";
import { loadProfile, saveProfile } from "./data/api";
import { Layout, type Tab } from "./components/Layout";
import { DiscoverView } from "./views/DiscoverView";
import { LibraryView } from "./views/LibraryView";
import { RankingView } from "./views/RankingView";

function App() {
  const [profile, setProfile] = useState<TasteProfile>(loadProfile);
  const [tab, setTab] = useState<Tab>("discover");

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const handleProfileChange = (p: TasteProfile) => {
    setProfile(p);
  };

  return (
    <Layout profile={profile} activeTab={tab} onTabChange={setTab}>
      {tab === "discover" && (
        <DiscoverView profile={profile} onProfileChange={handleProfileChange} />
      )}
      {tab === "library" && (
        <LibraryView profile={profile} onProfileChange={handleProfileChange} />
      )}
      {tab === "ranking" && (
        <RankingView
          profile={profile}
          onProfileChange={handleProfileChange}
          onNavigateToLibrary={() => setTab("library")}
        />
      )}
    </Layout>
  );
}

export default App;
