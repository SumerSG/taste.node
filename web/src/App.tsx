import { useEffect, useMemo, useState } from "react";
import type { TasteProfile, Filters, RankedItem, Venue } from "./data/types";
import { loadProfile, saveProfile, getRecommendations, addRankedItem } from "./data/api";
import { ClusterBadge } from "./components/ClusterBadge";
import { RankedListBuilder } from "./components/RankedListBuilder";
import { FiltersPanel } from "./components/FiltersPanel";
import { RecommendationsFeed } from "./components/RecommendationsFeed";
import { AddVenueModal } from "./components/AddVenueModal";

const DEFAULT_FILTERS: Filters = {
  cuisine: "",
  diet: "",
  price_tier: null,
  healthiness_min: 0,
  radius_km: 10,
};

function App() {
  const [profile, setProfile] = useState<TasteProfile>(loadProfile);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVenue, setModalVenue] = useState<Venue | undefined>(undefined);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const recommendations = useMemo(() => {
    return getRecommendations(profile, filters);
  }, [profile, filters]);

  const listCount = profile.contexts[profile.default_context].ranked_list.length;

  const handleAddNew = () => {
    setModalVenue(undefined);
    setModalOpen(true);
  };

  const handleAddRec = (venue: Venue) => {
    setModalVenue(venue);
    setModalOpen(true);
  };

  const handleSaveItem = (item: RankedItem) => {
    setProfile((p) => addRankedItem(p, item));
  };

  const showCluster = listCount >= 3;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">taste.node</h1>
          <p className="text-sm text-gray-600">Ranked-list similarity beats star ratings.</p>
        </div>
        {showCluster && <ClusterBadge profile={profile} />}
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          <RankedListBuilder
            profile={profile}
            onProfileChange={setProfile}
            onAddNew={handleAddNew}
          />
        </div>
        <div className="lg:col-span-7 space-y-6">
          <FiltersPanel filters={filters} onChange={setFilters} />
          <RecommendationsFeed recs={recommendations} onAdd={handleAddRec} />
        </div>
      </div>

      <AddVenueModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveItem}
        initialVenue={modalVenue}
      />
    </div>
  );
}

export default App;
