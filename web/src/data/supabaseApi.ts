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

/* ─── TasteProfile / Contexts ─── */

export async function loadProfileSupabase(): Promise<TasteProfile | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("contexts")
    .select("context_id, ranked_list, created_at, updated_at")
    .eq("user_id", userId);

  if (error) {
    console.warn("Supabase loadProfile error:", error.message);
    return null;
  }

  if (!data || data.length === 0) {
    // No profile yet — create one
    const defaultProfile = getDefaultProfile();
    defaultProfile.user_id = userId;
    await saveProfileSupabase(defaultProfile);
    return defaultProfile;
  }

  const contexts: Record<string, TasteProfile["contexts"][string]> = {};
  data.forEach((row) => {
    contexts[row.context_id] = {
      context_id: row.context_id,
      ranked_list: row.ranked_list as RankedItem[],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });

  return {
    user_id: userId,
    contexts,
    default_context: "default",
  };
}

export async function saveProfileSupabase(profile: TasteProfile): Promise<void> {
  if (!supabase) return;

  const { default_context, contexts } = profile;
  const ctx = contexts[default_context];
  if (!ctx) return;

  const { error } = await supabase
    .from("contexts")
    .upsert(
      {
        user_id: profile.user_id,
        context_id: default_context,
        ranked_list: ctx.ranked_list,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,context_id" }
    );

  if (error) {
    console.warn("Supabase saveProfile error:", error.message);
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
