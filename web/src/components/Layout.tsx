import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { TasteProfile } from "../data/types";
import {
  Search,
  ListOrdered,
  Home,
  PenLine,
  X,
  LogIn,
  LogOut,
  UserCircle,
} from "lucide-react";

export type Tab = "feed" | "search" | "profile" | "ranking";

interface Props {
  profile: TasteProfile;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onGlobalSearch?: (q: string) => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}

export function Layout({
  profile,
  activeTab,
  onTabChange,
  onGlobalSearch,
  user,
  onOpenAuth,
  onLogout,
  children,
}: Props) {
  const [wantText, setWantText] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "For You", icon: <Home size={16} /> },
    { id: "search", label: "Search", icon: <Search size={16} /> },
    { id: "profile", label: "Saved", icon: <UserCircle size={16} /> },
    { id: "ranking", label: "Top Picks", icon: <ListOrdered size={16} /> },
  ];

  const handleWantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wantText.trim() || !onGlobalSearch) return;
    onGlobalSearch(wantText.trim());
    setWantText("");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-cream-dark bg-cream shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button
            onClick={() => onTabChange("feed")}
            className="flex items-center gap-3 rounded-xl transition hover:bg-cream-dark/50 px-2 py-1 -ml-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sienna-500 text-white shadow-sm">
              <span className="font-serif text-lg leading-none">t</span>
            </div>
            <div>
              <h1 className="font-serif text-lg tracking-tight text-ink">taste.node</h1>
            </div>
          </button>

          {/* Right side: nav + auth */}
          <div className="flex items-center gap-2">
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

            {/* Auth widget */}
            {user ? (
              <div className="flex items-center gap-2 pl-2">
                <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-ink-muted ring-1 ring-cream-dark">
                  <UserCircle size={13} />
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-red-50 hover:text-red-500 transition disabled:opacity-50"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-lg bg-sienna-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sienna-600 active:scale-[0.98]"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
        </div>

        {/* Global search bar */}
        <div className="border-t border-cream-dark bg-cream">
          <div className="mx-auto max-w-7xl px-4 py-2.5">
            <form onSubmit={handleWantSubmit} className="relative">
              <PenLine size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                value={wantText}
                onChange={(e) => setWantText(e.target.value)}
                placeholder="Describe what you're craving..."
                className="w-full rounded-none border-0 border-b border-cream-dark bg-transparent py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint transition focus:border-sienna-400 focus:outline-none"
              />
              {wantText && (
                <button type="button" onClick={() => setWantText("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted" aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
