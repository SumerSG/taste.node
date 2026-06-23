import { useState } from "react";
import type { TasteProfile } from "../data/types";
import { getCluster } from "../data/api";
import { Sparkles, Search, ListOrdered, Home, BookOpen, PenLine } from "lucide-react";

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
    { id: "feed", label: "Feed", icon: <Home size={18} /> },
    { id: "search", label: "Search", icon: <Search size={18} /> },
    { id: "library", label: "Library", icon: <BookOpen size={18} /> },
    { id: "ranking", label: "My Ranking", icon: <ListOrdered size={18} /> },
  ];

  const handleWantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wantText.trim() || !onGlobalSearch) return;
    onGlobalSearch(wantText.trim());
    setWantText("");
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-surface-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-surface-900">taste.node</h1>
              <p className="text-[11px] font-medium text-surface-400">Ranked-list similarity beats star ratings</p>
            </div>
          </div>

          {/* Cluster pill */}
          {profile.contexts[profile.default_context].ranked_list.length >= 3 && showCluster && (
            <button
              onClick={() => setShowCluster((s) => !s)}
              className="hidden items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-100 sm:flex"
              title="Click to toggle cluster info"
            >
              <Sparkles size={13} />
              {cluster.label}
            </button>
          )}

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 rounded-xl bg-surface-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-surface-900 shadow-sm ring-1 ring-surface-200"
                    : "text-surface-500 hover:text-surface-700"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Global "What do you want?" bar */}
        <div className="border-t border-surface-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-2.5">
            <form onSubmit={handleWantSubmit} className="relative">
              <PenLine size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                value={wantText}
                onChange={(e) => setWantText(e.target.value)}
                placeholder="Describe what you're craving... (e.g. cozy ramen near Shibuya)"
                className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </form>
          </div>
        </div>
      </header>

      {/* Cluster banner */}
      {profile.contexts[profile.default_context].ranked_list.length >= 3 && showCluster && (
        <div className="border-b border-brand-100 bg-brand-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-brand-700">
              <Sparkles size={14} />
              <span className="font-semibold">{cluster.label}</span>
              <span className="text-brand-500">·</span>
              <span>{cluster.tagline}</span>
            </div>
            <button onClick={() => setShowCluster(false)} className="text-xs text-brand-400 hover:text-brand-600">
              Hide
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
