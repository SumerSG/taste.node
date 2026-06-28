import { useState, useMemo } from "react";
import type { FeedData, Venue, FeedMode, TasteProfile } from "../data/types";
import { deletePost, filterFeedPosts, getCurrentUserId, followUser, unfollowUser, isFollowing } from "../data/api";
import { getAllVenues } from "../data/venues";
import { Trash2, Camera, Users, Globe, Sparkles, UserPlus, UserCheck, MapPin } from "lucide-react";

import { useToast } from "../context/ToastContext";

interface Props {
  profile: TasteProfile;
  onProfileChange: (profile: TasteProfile) => void;
  feed: FeedData;
  onFeedChange: (feed: FeedData) => void;
  onNavigateToSearch: () => void;
  onNavigateToVenue: (venue: Venue) => void;
  onNavigateToProfile: (userId: string, userName: string) => void;
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

export function FeedView({ profile, onProfileChange, feed, onFeedChange, onNavigateToSearch, onNavigateToVenue, onNavigateToProfile }: Props) {
  const [mode, setMode] = useState<FeedMode>("global");
  const toast = useToast();

  const venueMap = useMemo(() => {
    const m = new Map<string, Venue>();
    getAllVenues().forEach((v) => m.set(v.id, v));
    return m;
  }, []);

  const filteredPosts = useMemo(() => filterFeedPosts(feed, mode, profile), [feed, mode, profile]);

  const handleDelete = (postId: string) => {
    if (!window.confirm("Delete this post?")) return;
    const next = deletePost(feed, postId);
    if (next !== feed) {
      onFeedChange(next);
      toast.show("Post deleted", "success");
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
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
                <button
                  className="flex items-center gap-3 text-left"
                  onClick={() => {
                    if (post.author_id !== (getCurrentUserId() ?? "anonymous")) {
                      onNavigateToProfile(post.author_id, post.author_name);
                    }
                  }}
                >
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
                </button>
                <div className="flex items-center gap-1">
                  {post.author_id !== (getCurrentUserId() ?? "anonymous") && (
                    <button
                      onClick={() => {
                        const was = isFollowing(profile, post.author_id);
                        if (was) {
                          onProfileChange(unfollowUser(profile, post.author_id));
                          toast.show(`Unfollowed ${post.author_name}`, "success");
                        } else {
                          onProfileChange(followUser(profile, post.author_id));
                          toast.show(`Following ${post.author_name}`, "success");
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
                <div className="relative w-full overflow-hidden rounded-xl bg-cream-dark" style={{ aspectRatio: "16/10" }}>
                  <img src={post.image_url} alt="Post" className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
              {/* Actions */}
              {post.author_id === (getCurrentUserId() ?? "anonymous") && (
                <div className="mt-3">
                  <button onClick={() => handleDelete(post.id)} className="rounded-lg p-2 text-ink-faint hover:bg-red-50 hover:text-red-500 transition min-h-[32px] min-w-[44px] inline-flex items-center justify-center" aria-label="Delete post">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
