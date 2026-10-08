"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type VoteResult = {
  error?: string;
  success?: boolean;
  /** The user's vote on this caption after the action: 1, -1, or null (cancelled). */
  vote?: 1 | -1 | null;
};

/**
 * Casts, switches, or cancels the signed-in user's vote on a caption.
 *
 *  - no existing vote            -> INSERT a new row into `caption_votes`
 *  - clicking the same vote again -> DELETE that row (cancels the vote)
 *  - clicking the opposite vote   -> UPDATE the row to the new value
 *
 * Server Actions are their own POST endpoint, so this authenticates the
 * caller itself instead of trusting that the UI only showed buttons to
 * signed-in users. The voter id always comes from the session, never from
 * the client, and every read/write is scoped to that id.
 */
export async function submitVote(
  captionId: number,
  value: number
): Promise<VoteResult> {
  const t0 = performance.now();
  const user = await getCurrentUser();
  const tAuth = performance.now();
  if (!user) {
    return { error: "You must be signed in to vote." };
  }

  // Never trust arguments from the client.
  if (!Number.isInteger(captionId) || captionId <= 0) {
    return { error: "Invalid caption." };
  }
  if (value !== 1 && value !== -1) {
    return { error: "Invalid vote." };
  }
  const newValue: 1 | -1 = value;

  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("caption_votes")
    .select("id, vote_value")
    .eq("caption_id", captionId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const tRead = performance.now();
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[vote] auth ${Math.round(tAuth - t0)}ms, read ${Math.round(tRead - tAuth)}ms (write follows)`
    );
  }

  if (readError) {
    return { error: "Couldn't save your vote. Please try again." };
  }

  // 1) First vote on this caption: insert a new row.
  if (!existing) {
    const { error } = await supabase.from("caption_votes").insert({
      caption_id: captionId,
      profile_id: user.id,
      vote_value: newValue,
    });

    if (error) {
      // 23505 = unique_violation (e.g. a double-click raced this request)
      if (error.code === "23505") {
        return { error: "You've already voted on this caption." };
      }
      return { error: "Couldn't save your vote. Please try again." };
    }

    return { success: true, vote: newValue };
  }

  // 2) Same vote clicked again: cancel it.
  if (existing.vote_value === newValue) {
    const { error } = await supabase
      .from("caption_votes")
      .delete()
      .eq("id", existing.id)
      .eq("profile_id", user.id);

    if (error) {
      return { error: "Couldn't cancel your vote. Please try again." };
    }

    return { success: true, vote: null };
  }

  // 3) Opposite vote clicked: switch it.
  const { error } = await supabase
    .from("caption_votes")
    .update({ vote_value: newValue })
    .eq("id", existing.id)
    .eq("profile_id", user.id);

  if (error) {
    return { error: "Couldn't change your vote. Please try again." };
  }

  return { success: true, vote: newValue };
}
