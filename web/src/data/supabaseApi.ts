import { supabase } from "../lib/supabase";
import type { TasteProfile, RankedItem, FeedData, Post } from "./types";
import { getDefaultProfile } from "./mockData";

/* ─── Helpers ─── */

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session.user.id;
}

/* ─── Profiles ─── */

async function loadProfileRow(userId: string): Promise<{ default_context: string; following: string[] } | null> {
  const { data, error } = await supabase!
    .from("profiles")
    .select("default_context, following")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code !== "PGRST116") { // PGRST116 = no rows
      console.warn("Supabase loadProfileRow error:", error.message);
    }
    return null;
  }
  return data;
}

async function upsertProfileRow(userId: string, default_context: string, following: string[]): Promise<void> {
  const { error } = await supabase!
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        default_context,
        following,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.warn("Supabase upsertProfileRow error:", error.message);
  }
}

/* ─── TasteProfile / Contexts ─── */

export async function loadProfileSupabase(): Promise<TasteProfile | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  // 1. Load contexts
  const { data: ctxData, error: ctxError } = await supabase
    .from("contexts")
    .select("context_id, ranked_list, created_at, updated_at")
    .eq("user_id", userId);

  if (ctxError) {
    console.warn("Supabase load contexts error:", ctxError.message);
    return null;
  }

  // 2. Load profile row (following + default_context)
  const profileRow = await loadProfileRow(userId);

  if (!ctxData || ctxData.length === 0) {
    // No contexts yet — create defaults
    const defaultProfile = getDefaultProfile();
    defaultProfile.user_id = userId;
    if (profileRow) {
      defaultProfile.default_context = profileRow.default_context;
      defaultProfile.following = profileRow.following ?? [];
    }
    await saveProfileSupabase(defaultProfile);
    return defaultProfile;
  }

  const contexts: Record<string, TasteProfile["contexts"][string]> = {};
  ctxData.forEach((row) => {
    contexts[row.context_id] = {
      context_id: row.context_id,
      ranked_list: (row.ranked_list ?? []) as RankedItem[],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  return {
    user_id: userId,
    contexts,
    default_context: profileRow?.default_context ?? "default",
    following: profileRow?.following ?? [],
  };
}

export async function saveProfileSupabase(profile: TasteProfile): Promise<void> {
  if (!supabase) return;

  const userId = await currentUserId();
  if (!userId) return;

  // 1. Upsert profile row
  await upsertProfileRow(userId, profile.default_context, profile.following);

  // 2. Upsert all contexts
  const rows = Object.values(profile.contexts).map((ctx) => ({
    user_id: userId,
    context_id: ctx.context_id,
    ranked_list: ctx.ranked_list,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("contexts")
      .upsert(rows, { onConflict: "user_id,context_id" });

    if (error) {
      console.warn("Supabase save contexts error:", error.message);
    }
  }
}

export async function deleteContextSupabase(contextId: string): Promise<void> {
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
    .select("id, author_id, author_name, text, venue_id, venue_name, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.warn("Supabase loadFeed error:", error.message);
    return null;
  }

  const posts: Post[] = (data ?? []).map((row) => ({
    id: row.id,
    author_id: row.author_id,
    author_name: row.author_name,
    text: row.text,
    venue_id: row.venue_id ?? undefined,
    venue_name: row.venue_name ?? undefined,
    image_url: row.image_url ?? undefined,
    created_at: row.created_at,
  }));

  return { posts };
}

export async function addPostSupabase(post: Post): Promise<boolean> {
  if (!supabase) return false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = post; // let DB generate uuid
  const { error } = await supabase.from("feed_posts").insert(rest);

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
