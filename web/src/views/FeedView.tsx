import { useState, useMemo } from "react";
import type { Post, FeedData, Venue } from "../data/types";
import { addPost, deletePost } from "../data/api";
import { ALL_VENUES } from "../data/mockData";
import { Plus, Image, X, MapPin, Send, Trash2, Camera } from "lucide-react";

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

export function FeedView({ feed, onFeedChange, onNavigateToSearch }: Props) {
  const [ composing, setComposing ] = useState(false);
  const [ text, setText ] = useState("");
  const [ imageUrl, setImageUrl ] = useState("");
  const [ venueId, setVenueId ] = useState("");

  const venueMap = useMemo(() => {
    const m = new Map<string, Venue>();
    ALL_VENUES.forEach((v) => m.set(v.id, v));
    return m;
  }, []);

  const selectedVenue = venueId ? venueMap.get(venueId) ?? null : null;

  const handleSubmit = () => {
    if (!text.trim() && !imageUrl.trim()) return;
    const post: Post = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      author_id: "demo_user",
      author_name: "You",
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
      {/* Big Add Recommendation button */}
      <button
        onClick={() => setComposing(true)}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-600 px-6 py-5 text-lg font-bold text-white shadow-elevated transition-all hover:bg-brand-700 hover:shadow-card-hover active:scale-[0.98]"
      >
        <Plus size={24} /> Add Recommendation
      </button>

      {/* Composer modal */}
      {composing && (
        <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-card ring-1 ring-surface-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-surface-900">Share a place you loved</h3>
            <button onClick={() => setComposing(false)} className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600">
              <X size={18} />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you love about it?"
            className="mb-3 w-full rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            rows={3}
          />

          <div className="mb-3 flex items-center gap-2">
            <MapPin size={14} className="text-surface-400" />
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="flex-1 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Tag a restaurant (optional)</option>
              {ALL_VENUES.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Image size={14} className="text-surface-400" />
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste a photo URL (optional)"
              className="flex-1 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
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

      {/* Feed posts */}
      {feed.posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-surface-200 py-20 text-center">
          <Camera size={40} className="mb-3 text-surface-300" />
          <p className="text-lg font-semibold text-surface-600">No posts yet</p>
          <p className="text-sm text-surface-400 mt-1 mb-5">Be the first to share a place you loved.</p>
          <button onClick={() => setComposing(true)} className="btn-primary gap-2">
            <Plus size={15} /> Add Recommendation
          </button>
          <button onClick={onNavigateToSearch} className="btn-ghost mt-3 gap-2 text-sm">
            Or browse restaurants
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {feed.posts.map((post) => (
            <div key={post.id} className="rounded-2xl border border-surface-200 bg-white p-5 shadow-card ring-1 ring-surface-100 transition hover:shadow-card-hover">
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {avatarInitial(post.author_name)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-surface-900">{post.author_name}</div>
                    <div className="text-xs text-surface-400">{timeAgo(post.created_at)}</div>
                  </div>
                </div>
                {post.author_id === "demo_user" && (
                  <button onClick={() => handleDelete(post.id)} className="rounded p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Text */}
              {post.text && <p className="mb-3 whitespace-pre-wrap text-sm text-surface-800 leading-relaxed">{post.text}</p>}

              {/* Venue tag */}
              {post.venue_id && post.venue_name && (
                <button
                  onClick={onNavigateToSearch}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-100"
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
    </div>
  );
}
