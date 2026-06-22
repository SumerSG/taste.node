import { useState } from "react";
import type { TasteProfile } from "../data/types";
import { getCluster } from "../data/api";
import { Sparkles, Compass, Library, ListOrdered } from "lucide-react";

export type Tab = "discover" | "library" | "ranking";

interface Props {
  profile: TasteProfile;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  children: React.ReactNode;
}

export function Layout({ profile, activeTab, onTabChange, children }: Props) {
  const cluster = getCluster(profile);
  const [showCluster, setShowCluster] = useState(true);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "discover", label: "Discover", icon: <Compass size={18} /> },
    { id: "library", label: "Library", icon: <Library size={18} /> },
    { id: "ranking", label: "My Ranking", icon: <ListOrdered size={18} /> },
  ];

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
