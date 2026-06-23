import { useState } from "react";
import type { TasteProfile } from "../data/types";
import { getCluster } from "../data/api";
import { Search, ListOrdered, Home, BookOpen, PenLine, X } from "lucide-react";

export type Tab = "feed" | "search" | "library" | "ranking";

interface Props {
  profile: TasteProfile;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onGlobalSearch?: (q: string) => void;
  children: React.ReactNode;
}

export function Layout({ profile, activeTab, onTabChange, onGlobalSearch, children }: Props) {
  const cluster = getCluster(profile);
  const [showCluster, setShowCluster] = useState(true);
  const [wantText, setWantText] = useState("");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "Feed", icon: <Home size={16} /> },
    { id: "search", label: "Search", icon: <Search size={16} /> },
    { id: "library", label: "Library", icon: <BookOpen size={16} /> },
    { id: "ranking", label: "My Ranking", icon: <ListOrdered size={16} /> },
  ];

  const handleWantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wantText.trim() || !onGlobalSearch) return;
    onGlobalSearch(wantText.trim());
    setWantText("");
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-cream-dark bg-cream shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sienna-500 text-white shadow-sm">
              <span className="font-serif text-lg leading-none">t</span>
            </div>
            <div>
              <h1 className="font-serif text-lg tracking-tight text-ink">taste.node</h1>
            </div>
          </div>

          {/* Cluster pill */}
          {profile.contexts[profile.default_context].ranked_list.length >= 3 && showCluster && (
            <button
              onClick={() => setShowCluster((s) => !s)}
              className="hidden items-center gap-2 rounded-full bg-sienna-50 px-3 py-1.5 text-xs font-medium text-sienna-700 ring-1 ring-sienna-200 transition hover:bg-sienna-100 sm:flex"
              title="Click to toggle cluster info"
            >
              {cluster.label}
            </button>
          )}

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 rounded-xl bg-cream p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-paper text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink-muted"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Global search bar */}
        <div className="border-t border-cream-dark bg-cream">
          <div className="mx-auto max-w-7xl px-4 py-2.5">
            <form onSubmit={handleWantSubmit} className="relative">
              <PenLine size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={wantText}
                onChange={(e) => setWantText(e.target.value)}
                placeholder="Describe what you're craving... (e.g. cozy ramen near Shibuya)"
                className="w-full rounded-xl border border-cream-dark bg-paper py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
              />
            </form>
          </div>
        </div>
      </header>

      {/* Cluster banner */}
      {profile.contexts[profile.default_context].ranked_list.length >= 3 && showCluster && (
        <div className="border-b border-olive-200 bg-olive-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-olive-700">
              <span className="font-medium">{cluster.label}</span>
              <span className="text-olive-400">·</span>
              <span className="text-olive-600">{cluster.tagline}</span>
            </div>
            <button onClick={() => setShowCluster(false)} className="text-xs text-olive-400 hover:text-olive-600">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
