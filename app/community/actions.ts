"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getIsSuperadmin } from "@/lib/auth";
import { COMMUNITY_BUCKET, MAX_POST_CHARS, communityImageUrl } from "@/lib/community";

export type PostResult = { error?: string; ok?: boolean };

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PENDING = 10;

// Best-effort per-instance limit: 6 submissions per 10 minutes per user.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CALLS = 6;
const recent = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const calls = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  const hit = calls.length >= MAX_CALLS;
  if (!hit) calls.push(now);
  recent.set(key, calls);
  return hit;
}

function isJpeg(b: Uint8Array) {
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

/**
 * Submits a caption (and optionally the finished meme image) for admin
 * approval. Nothing is public until an admin approves it.
 */
export async function submitPost(formData: FormData): Promise<PostResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to post." };
  if (limited(user.id)) return { error: "Slow down a little and try again in a few minutes." };

  const text = String(formData.get("text") ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 1 || text.length > MAX_POST_CHARS) {
    return { error: `Captions need 1 to ${MAX_POST_CHARS} characters.` };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id)
    .eq("status", "pending");
  if ((count ?? 0) >= MAX_PENDING) {
    return { error: "You have a lot of posts waiting for review. Wait for those first." };
  }

  const file = formData.get("image");
  let imagePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return { error: "That image is too big." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isJpeg(bytes)) return { error: "Meme images must be JPEG." };
    imagePath = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(COMMUNITY_BUCKET)
      .upload(imagePath, bytes, { contentType: "image/jpeg", upsert: false });
    if (upErr) return { error: "Couldn't upload your meme. Please try again." };
  }

  const { error } = await supabase.from("community_posts").insert({
    author_id: user.id,
    kind: imagePath ? "meme" : "caption",
    caption_text: text,
    image_path: imagePath,
  });

  if (error) {
    if (imagePath) await supabase.storage.from(COMMUNITY_BUCKET).remove([imagePath]);
    return { error: "Couldn't submit your post. Please try again." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Withdraws one of your own posts that hasn't been approved yet. */
export async function deleteMyPost(postId: number): Promise<PostResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  if (!Number.isInteger(postId) || postId <= 0) return { error: "Invalid post." };

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("community_posts")
    .select("id, image_path, status")
    .eq("id", postId)
    .eq("author_id", user.id)
    .maybeSingle();
  if (!post) return { error: "Post not found." };
  if (post.status === "approved") return { error: "Approved posts can't be withdrawn." };

  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);
  if (error) return { error: "Couldn't delete that post." };

  if (post.image_path) await supabase.storage.from(COMMUNITY_BUCKET).remove([post.image_path]);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Admin only: publish a pending post to the feed. */
export async function approvePost(postId: number): Promise<PostResult> {
  const user = await getCurrentUser();
  if (!user || !(await getIsSuperadmin())) return { error: "Admins only." };
  if (!Number.isInteger(postId) || postId <= 0) return { error: "Invalid post." };

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("community_posts")
    .select("id, author_id, kind, caption_text, image_path, status")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.status !== "pending") return { error: "That post isn't pending anymore." };

  let imageId: number | null = null;
  if (post.image_path) {
    const { data: img, error: imgErr } = await supabase
      .from("images")
      .insert({
        url: communityImageUrl(post.image_path),
        storage_path: post.image_path,
        description: post.caption_text,
        is_seed: false,
        created_by: post.author_id,
      })
      .select("id")
      .single();
    if (imgErr || !img) return { error: "Couldn't save the image record." };
    imageId = img.id;
  }

  const { data: cap, error: capErr } = await supabase
    .from("captions")
    .insert({
      image_description: post.kind === "meme" ? "Community meme" : "Community caption",
      caption_text: post.caption_text,
      votes: 0,
      image_id: imageId,
      is_seed: false,
    })
    .select("id")
    .single();
  if (capErr || !cap) {
    if (imageId) await supabase.from("images").delete().eq("id", imageId);
    return { error: "Couldn't publish the caption." };
  }

  const { error: updErr } = await supabase
    .from("community_posts")
    .update({ status: "approved", caption_id: cap.id })
    .eq("id", postId)
    .eq("status", "pending");
  if (updErr) {
    await supabase.from("captions").delete().eq("id", cap.id);
    if (imageId) await supabase.from("images").delete().eq("id", imageId);
    return { error: "Couldn't mark the post approved." };
  }

  revalidatePath("/");
  revalidatePath("/admin/review");
  return { ok: true };
}

/** Admin only: reject a pending post. */
export async function rejectPost(postId: number): Promise<PostResult> {
  const user = await getCurrentUser();
  if (!user || !(await getIsSuperadmin())) return { error: "Admins only." };
  if (!Number.isInteger(postId) || postId <= 0) return { error: "Invalid post." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("community_posts")
    .update({ status: "rejected" })
    .eq("id", postId)
    .eq("status", "pending");
  if (error) return { error: "Couldn't reject that post." };

  revalidatePath("/admin/review");
  return { ok: true };
}
