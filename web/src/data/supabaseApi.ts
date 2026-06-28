import { supabase } from "../lib/supabase";
import type {
  TasteProfile,
  RankedItem,
  FeedData,
  Post,
  Venue,
  RankStatus,
} from "./types";

/* ─── Helpers ─── */

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session.user.id;
}

/* ─── Profile (Contexts + Ranked Items + Follows) ─── */

export async function loadProfileSupabase(): Promise<TasteProfile | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  // 1. Load profiles row
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("default_context, include_in_clustering")
    .eq("user_id", userId)
    .single();

  if (profileError || !profileData) {
    if (profileError && profileError.code !== "PGRST116") {
      console.warn("Supabase loadProfile error:", profileError.message);
    }
    return null;
  }

  // 2. Load contexts
  const { data: ctxData, error: ctxError } = await supabase
    .from("contexts")
    .select("context_id, created_at, updated_at")
    .eq("user_id", userId);

  if (ctxError) {
    console.warn("Supabase load contexts error:", ctxError.message);
  }

  // 3. Load ranked_items
  const { data: itemsData, error: itemsError } = await supabase
    .from("ranked_items")
    .select(
      "context_id, venue, visited_at, added_at, occasion_tag, is_classic, status, personal_rating, reaction, meal_type, dishes"
    )
    .eq("user_id", userId);

  if (itemsError) {
    console.warn("Supabase load ranked_items error:", itemsError.message);
  }

  // 4. Load follows
  const { data: followsData, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (followsError) {
    console.warn("Supabase load follows error:", followsError.message);
  }

  // 5. Group ranked_items by context_id
  const itemsByContext: Record<string, RankedItem[]> = {};
  (itemsData ?? []).forEach((row) => {
    if (!itemsByContext[row.context_id]) {
      itemsByContext[row.context_id] = [];
    }
    itemsByContext[row.context_id].push({
      venue: (row.venue as unknown) as Venue,
      visited_at: row.visited_at,
      added_at: row.added_at,
      occasion_tag: row.occasion_tag as RankedItem["occasion_tag"],
      is_classic: row.is_classic,
      status: (row.status as RankStatus) ?? undefined,
      personal_rating: row.personal_rating ?? undefined,
      reaction: row.reaction ?? undefined,
      meal_type: (row.meal_type as RankedItem["meal_type"]) ?? undefined,
      dishes: Array.isArray(row.dishes) ? (row.dishes as string[]) : [],
    });
  });

  // 6. Assemble contexts
  const contexts: Record<string, TasteProfile["contexts"][string]> = {};
  (ctxData ?? []).forEach((row) => {
    contexts[row.context_id] = {
      context_id: row.context_id,
      ranked_list: itemsByContext[row.context_id] ?? [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  const following = (followsData ?? []).map((f) => f.following_id);

  return {
    user_id: userId,
    contexts,
    default_context: profileData.default_context,
    include_in_clustering: profileData.include_in_clustering,
    following,
  };
}

export async function saveProfileSupabase(
  profile: TasteProfile
): Promise<void> {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;

  // a. Upsert profiles row
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      default_context: profile.default_context,
      include_in_clustering: profile.include_in_clustering ?? true,
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    console.warn("Supabase save profile error:", profileError.message);
  }

  // b. Upsert all contexts
  const contextRows = Object.values(profile.contexts).map((ctx) => ({
    context_id: ctx.context_id,
    user_id: userId,
    name: ctx.context_id,
    updated_at: new Date().toISOString(),
  }));

  if (contextRows.length > 0) {
    const { error: ctxError } = await supabase
      .from("contexts")
      .upsert(contextRows, { onConflict: "context_id, user_id" });
    if (ctxError) {
      console.warn("Supabase save contexts error:", ctxError.message);
    }
  }

  // c. Sync ranked_items per context
  for (const ctx of Object.values(profile.contexts)) {
    const { error: delError } = await supabase
      .from("ranked_items")
      .delete()
      .eq("user_id", userId)
      .eq("context_id", ctx.context_id);

    if (delError) {
      console.warn(
        `Supabase delete ranked_items error for ${ctx.context_id}:`,
        delError.message
      );
      continue;
    }

    if (ctx.ranked_list.length > 0) {
      const itemRows = ctx.ranked_list.map((item) => ({
        context_id: ctx.context_id,
        user_id: userId,
        venue: (item.venue as unknown) as Record<string, unknown>,
        visited_at: item.visited_at,
        added_at: item.added_at,
        occasion_tag: item.occasion_tag,
        is_classic: item.is_classic,
        status: item.status ?? null,
        personal_rating: item.personal_rating ?? null,
        reaction: item.reaction ?? null,
        meal_type: item.meal_type ?? null,
        dishes: item.dishes ?? [],
      }));

      const { error: insertError } = await supabase
        .from("ranked_items")
        .insert(itemRows);

      if (insertError) {
        console.warn(
          `Supabase insert ranked_items error for ${ctx.context_id}:`,
          insertError.message
        );
      }
    }
  }

  // d. Sync follows
  const { error: delFollowsError } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId);

  if (delFollowsError) {
    console.warn("Supabase delete follows error:", delFollowsError.message);
  }

  if (profile.following.length > 0) {
    const followRows = profile.following.map((followingId) => ({
      follower_id: userId,
      following_id: followingId,
    }));

    const { error: insertFollowsError } = await supabase
      .from("follows")
      .insert(followRows);

    if (insertFollowsError) {
      console.warn(
        "Supabase insert follows error:",
        insertFollowsError.message
      );
    }
  }
}

export async function deleteContextSupabase(
  contextId: string
): Promise<void> {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from("contexts")
    .delete()
    .eq("user_id", userId)
    .eq("context_id", contextId);

  if (error) {
    console.warn("Supabase deleteContext error:", error.message);
  }
}

/* ─── Feed Posts ─── */

export async function loadFeedSupabase(): Promise<FeedData | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("feed_posts")
    .select(
      "id, author_id, author_name, text, venue_id, venue_name, image_url, likes, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    // Missing likes column → migration not applied yet; fall back to local seed
    if (error.message?.toLowerCase().includes("likes") &&
        error.message?.toLowerCase().includes("does not exist")) {
      console.warn("Supabase likes column missing; falling back to local feed");
    } else {
      console.warn("Supabase loadFeed error:", error.message);
    }
    return null;
  }

  const rows = data ?? [];
  if (rows.length === 0) return null;

  // Build liked-by-me set (gracefully handle missing post_likes table)
  const userId = await currentUserId();
  let likedSet = new Set<string>();
  if (userId) {
    try {
      const { data: likeData } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", userId);
      likedSet = new Set((likeData ?? []).map((l) => l.post_id));
    } catch {
      // post_likes table may not exist yet; ignore
    }
  }

  const posts: Post[] = rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    author_name: row.author_name,
    text: row.text,
    venue_id: row.venue_id ?? undefined,
    venue_name: row.venue_name ?? undefined,
    image_url: row.image_url ?? undefined,
    likes: row.likes ?? 0,
    liked_by_me: likedSet.has(row.id),
    created_at: row.created_at,
  }));

  return { posts };
}

export async function addPostSupabase(post: Post): Promise<boolean> {
  if (!supabase) return false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, likes, ...rest } = post; // let DB generate uuid
  const { error } = await supabase.from("feed_posts").insert({ ...rest, likes: likes ?? 0 });

  if (error) {
    console.warn("Supabase addPost error:", error.message);
    return false;
  }
  return true;
}

export async function deletePostSupabase(postId: string): Promise<boolean> {
  if (!supabase) return false;

  const userId = await currentUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from("feed_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", userId);

  if (error) {
    console.warn("Supabase deletePost error:", error.message);
    return false;
  }
  return true;
}

export async function toggleLikeSupabase(
  postId: string
): Promise<{ liked_by_me: boolean; likes: number } | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  try {
    const { data: existing } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .single();

    if (existing) {
      // Unlike
      await supabase
        .from("post_likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);
      const { data: post } = await supabase
        .from("feed_posts")
        .select("likes")
        .eq("id", postId)
        .single();
      return { liked_by_me: false, likes: Math.max(0, (post?.likes ?? 0) - 1) };
    } else {
      // Like
      await supabase
        .from("post_likes")
        .insert({ user_id: userId, post_id: postId });
      const { data: post } = await supabase
        .from("feed_posts")
        .select("likes")
        .eq("id", postId)
        .single();
      return { liked_by_me: true, likes: (post?.likes ?? 0) + 1 };
    }
  } catch {
    // post_likes table may not exist yet → let caller fall back to localStorage
    return null;
  }
}
