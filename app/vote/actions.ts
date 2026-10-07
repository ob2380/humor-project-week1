"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type VoteResult = {
  error?: string;
  success?: boolean;
};

/**
 * Records a vote by inserting a new row into `caption_votes`.
 *
 * Server Actions are their own POST endpoint, so this authenticates the
 * caller itself instead of trusting that the UI only showed buttons to
 * signed-in users. The voter id always comes from the session, never from
 * the client.
 */
export async function submitVote(
  captionId: number,
  value: number
): Promise<VoteResult> {
  const user = await getCurrentUser();
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

  const supabase = await createClient();
  const { error } = await supabase.from("caption_votes").insert({
    caption_id: captionId,
    profile_id: user.id,
    vote_value: value,
  });

  if (error) {
    // 23505 = unique_violation (one vote per user per caption)
    if (error.code === "23505") {
      return { error: "You've already voted on this caption." };
    }
    // 23503 = foreign_key_violation (no such caption or no profile row yet)
    if (error.code === "23503") {
      return { error: "Couldn't record that vote." };
    }
    return { error: "Couldn't save your vote. Please try again." };
  }

  revalidatePath("/");
  return { success: true };
}
