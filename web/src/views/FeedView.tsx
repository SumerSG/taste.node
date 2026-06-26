import { useState, useMemo, useEffect, useRef } from "react";
import type { Post, FeedData, Venue, FeedMode, TasteProfile } from "../data/types";
import { addPost, deletePost, filterFeedPosts, getCurrentUserId, followUser, unfollowUser, isFollowing } from "../data/api";
import { getAllVenues } from "../data/venues";
import { Plus, Image, X, MapPin, Send, Trash2, Camera, Users, Globe, Sparkles, UserPlus, UserCheck, Search, UtensilsCrossed } from "lucide-react";

interface Props {
  profile: TasteProfile;
  onProfileChange: (profile: TasteProfile) => void;
  feed: FeedData;
  onFeedChange: (feed: FeedData) => void;
  onNavigateToSearch: () => void;
  onNavigateToVenue: (venue: Venue) => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function avatarInitial(name: string) {
  return name.split(" ")[0][0].toUpperCase();
}

const MODES: { id: FeedMode; label: string; icon: React.ReactNode }[] = [
  { id: "following", label: "Following", icon: <Users size={13} /> },
  { id: "recommended", label: "For You", icon: <Sparkles size={13} /> },
  { id: "global", label: "Global", icon: <Globe size={13} /> },
];

export function FeedView({ profile, onProfileChange, feed, onFeedChange, onNavigateToSearch, onNavigateToVenue }: Props) {
  const [mode, setMode] = useState<FeedMode>("recommended");
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [venueId, setVenueId] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFabOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, [fabOpen]);

  const venueMap = useMemo(() => {
    const m = new Map<string, Venue>();
    getAllVenues().forEach((v) => m.set(v.id, v));
    return m;
  }, []);

  const selectedVenue = venueId ? venueMap.get(venueId) ?? null : null;
  const filteredPosts = useMemo(() => filterFeedPosts(feed, mode, profile), [feed, mode, profile]);

  const handleSubmit = () => {
    if (!text.trim() && !imageUrl.trim()) return;
    const me = getCurrentUserId() ?? "anonymous";
    const post: Post = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      author_id: me,
      author_name: me === "anonymous" ? "You" : "You",
      text: text.trim(),
      venue_id: venueId || undefined,
      venue_name: selectedVenue?.name,
      image_url: imageUrl.trim() || undefined,
      created_at: new Date().toISOString(),
    };
    onFeedChange(addPost(feed, post));
    setText("");
    setImageUrl("");
    setVenueId("");
    setComposing(false);
  };

  const handleDelete = (postId: string) => {
    onFeedChange(deletePost(feed, postId));
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Composer modal */}
      {composing && (
        <div className="taste-card rounded-2xl border border-cream-dark bg-paper p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-lg text-ink">Share a place you loved</h3>
            <button onClick={() => setComposing(false)} className="rounded-lg p-1 text-ink-faint hover:bg-cream hover:text-ink-muted">
              <X size={18} />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What was the one thing you can't stop thinking about?"
            className="mb-3 w-full rounded-xl border border-cream-dark bg-cream p-3 text-sm leading-relaxed shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
            rows={3}
          />

          <div className="mb-3 flex items-center gap-2">
            <MapPin size={14} className="text-ink-faint" />
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="flex-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
            >
                <option value="">Tag a restaurant (optional)</option>
                {getAllVenues().map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
            </select>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Image size={14} className="text-ink-faint" />
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste a photo URL (optional)"
              className="flex-1 rounded-xl border border-cream-dark bg-cream px-3 py-2 text-sm shadow-sm transition focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
            />
          </div>

          {imageUrl && (
            <div className="mb-4 overflow-hidden rounded-xl">
              <img src={imageUrl} alt="Preview" className="max-h-64 w-full object-cover" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setComposing(false)} className="btn-secondary text-sm">Cancel</button>
            <button onClick={handleSubmit} className="btn-primary gap-2 text-sm">
              <Send size={14} /> Post
            </button>
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center rounded-xl bg-cream-warm p-1 shadow-sm">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-paper text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink-muted"
                }`}
                aria-pressed={active}
              >
                {m.icon}
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed posts */}
      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-cream-dark py-20 text-center">
          <Camera size={40} className="mb-3 text-ink-faint" />
          <p className="font-serif text-lg text-ink-muted">
            {mode === "following" && "Nobody you follow has posted yet"}
            {mode === "recommended" && "No recommendations from your cluster yet"}
            {mode === "global" && "No posts yet"}
          </p>
          <p className="text-sm text-ink-faint mt-2 mb-6 max-w-xs">
            {mode === "following"
              ? "Follow more people to see their recommendations here."
              : mode === "recommended"
              ? "Add a few more spots to your ranking to unlock cluster picks."
              : "Be the first to share a place you loved."}
          </p>
          {mode === "following" ? (
            <button onClick={onNavigateToSearch} className="btn-ghost gap-2 text-sm">
              Browse restaurants to discover people
            </button>
          ) : (
            <button onClick={onNavigateToSearch} className="btn-ghost gap-2 text-sm">
              Browse restaurants
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="taste-card rounded-2xl border border-cream-dark bg-paper p-5"
            >
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    post.author_id === (getCurrentUserId() ?? "anonymous")
                      ? "bg-sienna-50 text-sienna-700"
                      : "bg-cream text-ink-muted"
                  }`}>
                    {avatarInitial(post.author_name)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{post.author_name}</div>
                    <div className="text-[11px] text-ink-faint">{timeAgo(post.created_at)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {post.author_id !== (getCurrentUserId() ?? "anonymous") && (
                    <button
                      onClick={() => {
                        if (isFollowing(profile, post.author_id)) {
                          onProfileChange(unfollowUser(profile, post.author_id));
                        } else {
                          onProfileChange(followUser(profile, post.author_id));
                        }
                      }}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        isFollowing(profile, post.author_id)
                          ? "bg-cream text-ink-muted ring-1 ring-cream-dark hover:bg-red-50 hover:text-red-500"
                          : "bg-sienna-50 text-sienna-700 ring-1 ring-sienna-200 hover:bg-sienna-100"
                      }`}
                    >
                      {isFollowing(profile, post.author_id) ? (
                        <><UserCheck size={12} /> Following</>
                      ) : (
                        <><UserPlus size={12} /> Follow</>
                      )}
                    </button>
                  )}
                  {post.author_id === (getCurrentUserId() ?? "anonymous") && (
                    <button onClick={() => handleDelete(post.id)} className="rounded p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Text */}
              {post.text && <p className="mb-3 whitespace-pre-wrap text-base leading-relaxed text-ink-light">{post.text}</p>}

              {/* Venue tag */}
              {post.venue_id && post.venue_name && (
                <button
                  onClick={() => {
                    const v = venueMap.get(post.venue_id!);
                    if (v) onNavigateToVenue(v);
                  }}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sienna-50 px-3 py-1.5 text-xs font-medium text-sienna-700 ring-1 ring-sienna-200 transition hover:bg-sienna-100"
                >
                  <MapPin size={12} /> {post.venue_name}
                </button>
              )}

              {/* Image */}
              {post.image_url && (
                <div className="overflow-hidden rounded-xl">
                  <img src={post.image_url} alt="Post" className="w-full object-cover" loading="lazy" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB Menu */}
      <div ref={fabRef} className="fixed bottom-6 right-6 z-50">
        {fabOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2">
            <button
              onClick={() => { setFabOpen(false); setComposing(true); }}
              className="flex items-center gap-2 rounded-xl bg-paper px-4 py-2.5 text-sm font-medium text-ink shadow-elevated ring-1 ring-cream-dark transition hover:bg-cream"
            >
              <Camera size={16} className="text-sienna-500" /> New Post
            </button>
            <button
              onClick={() => { setFabOpen(false); onNavigateToSearch(); }}
              className="flex items-center gap-2 rounded-xl bg-paper px-4 py-2.5 text-sm font-medium text-ink shadow-elevated ring-1 ring-cream-dark transition hover:bg-cream"
            >
              <UtensilsCrossed size={16} className="text-sienna-500" /> Search Restaurant
            </button>
            <button
              onClick={() => { setFabOpen(false); setShowUserSearch(true); }}
              className="flex items-center gap-2 rounded-xl bg-paper px-4 py-2.5 text-sm font-medium text-ink shadow-elevated ring-1 ring-cream-dark transition hover:bg-cream"
            >
              <Users size={16} className="text-sienna-500" /> Search User
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen((s) => !s)}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-sienna-500 text-white shadow-elevated transition-all hover:bg-sienna-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-sienna-200 ${fabOpen ? 'rotate-45' : ''}`}
          aria-label="Open menu"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      {/* User Search Overlay */}
      {showUserSearch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:p-4 sm:items-center backdrop-blur-sm">
          <div className="flex max-h-[80vh] w-full sm:max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-paper shadow-elevated">
            <div className="flex items-center justify-between border-b border-cream-dark px-5 py-3">
              <h3 className="font-serif text-lg text-ink">Find people</h3>
              <button onClick={() => setShowUserSearch(false)} className="rounded-full p-1 text-ink-faint hover:bg-cream transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full rounded-xl border border-cream-dark bg-cream py-2 pl-9 pr-4 text-sm shadow-sm focus:border-sienna-400 focus:outline-none focus:ring-2 focus:ring-sienna-100"
                  autoFocus
                />
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[50vh]">
                {/* Only show sample users as "discoverable" users for now */}
                {([
                  { id: "alex_12", name: "Alex M." },
                  { id: "jordan_34", name: "Jordan T." },
                  { id: "sam_88", name: "Sam K." },
                  { id: "taylor_09", name: "Taylor R." },
                  { id: "casey_22", name: "Casey L." },
                  { id: "morgan_45", name: "Morgan B." },
                  { id: "riley_17", name: "Riley S." },
                  { id: "quinn_63", name: "Quinn J." },
                  { id: "avery_29", name: "Avery P." },
                  { id: "jules_51", name: "Jules D." },
                  { id: "kenji_08", name: "Kenji Y." },
                  { id: "priya_41", name: "Priya N." },
                ] as const)
                  .filter((u) => u.name.toLowerCase().includes(userQuery.toLowerCase()))
                  .map((u) => {
                    const following = isFollowing(profile, u.id);
                    return (
                      <div key={u.id} className="flex items-center justify-between rounded-xl border border-cream-dark bg-cream px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sienna-50 text-sm font-bold text-sienna-700">
                            {u.name.split(" ")[0][0]}
                          </div>
                          <span className="text-sm font-medium text-ink">{u.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (following) {
                              onProfileChange(unfollowUser(profile, u.id));
                            } else {
                              onProfileChange(followUser(profile, u.id));
                            }
                          }}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                            following
                              ? "bg-cream text-ink-muted ring-1 ring-cream-dark hover:bg-red-50 hover:text-red-500"
                              : "bg-sienna-50 text-sienna-700 ring-1 ring-sienna-200 hover:bg-sienna-100"
                          }`}
                        >
                          {following ? <><UserCheck size={12} /> Following</> : <><UserPlus size={12} /> Follow</>}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
