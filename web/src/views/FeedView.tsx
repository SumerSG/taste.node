import { useState, useMemo } from "react";
import type { Post, FeedData, Venue, FeedMode } from "../data/types";
import { addPost, deletePost, filterFeedPosts, getCurrentUserId } from "../data/api";
import { getAllVenues } from "../data/venues";
import { Plus, Image, X, MapPin, Send, Trash2, Camera, Users, Globe, Sparkles } from "lucide-react";

interface Props {
  feed: FeedData;
  onFeedChange: (feed: FeedData) => void;
  onNavigateToSearch: () => void;
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

export function FeedView({ feed, onFeedChange, onNavigateToSearch }: Props) {
  const [mode, setMode] = useState<FeedMode>("recommended");
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [venueId, setVenueId] = useState("");

  const venueMap = useMemo(() => {
    const m = new Map<string, Venue>();
    getAllVenues().forEach((v) => m.set(v.id, v));
    return m;
  }, []);

  const selectedVenue = venueId ? venueMap.get(venueId) ?? null : null;
  const filteredPosts = useMemo(() => filterFeedPosts(feed, mode), [feed, mode]);

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
                {post.author_id === (getCurrentUserId() ?? "anonymous") && (
                  <button onClick={() => handleDelete(post.id)} className="rounded p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Text */}
              {post.text && <p className="mb-3 whitespace-pre-wrap text-base leading-relaxed text-ink-light">{post.text}</p>}

              {/* Venue tag */}
              {post.venue_id && post.venue_name && (
                <button
                  onClick={onNavigateToSearch}
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

      {/* Floating Action Button */}
      <button
        onClick={() => setComposing(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sienna-500 text-white shadow-elevated transition-all hover:bg-sienna-600 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-sienna-200"
        aria-label="Add recommendation"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
