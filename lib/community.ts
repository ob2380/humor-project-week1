export const COMMUNITY_BUCKET = "community-memes";
export const MAX_POST_CHARS = 200;

export type PostStatus = "pending" | "approved" | "rejected";

/** Public URL of an uploaded community meme (the bucket is public-read, not listable). */
export function communityImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${COMMUNITY_BUCKET}/${path}`;
}
