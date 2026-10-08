import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

import {
  DAILY_VOTE_GOAL,
  XP_PER_LEVEL,
  statsFromVotes,
  type PlayerStats,
} from "@/lib/gameMath";

export { DAILY_VOTE_GOAL, XP_PER_LEVEL, statsFromVotes };
export type { PlayerStats };

/** Stats for the signed-in user, or null when signed out. */
export const getPlayerStats = cache(async (): Promise<PlayerStats | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [total, recent] = await Promise.all([
    supabase
      .from("caption_votes")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id),
    supabase
      .from("caption_votes")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .gte("created_at", since),
  ]);

  return statsFromVotes(total.count ?? 0, recent.count ?? 0);
});

/**
 * "Hot" ranking: net score decayed by age, so a fresh caption with a few
 * votes can outrank an old one with more. (Hacker-News-style gravity.)
 */
export function hotScore(net: number, createdAt: string, now = Date.now()) {
  const ageHours = Math.max(0, (now - new Date(createdAt).getTime()) / 3_600_000);
  return net / Math.pow(ageHours + 2, 1.5);
}

export type RankRow = {
  rank: number;
  name: string;
  votes: number;
  isMe: boolean;
};

function displayName(first: string | null, last: string | null) {
  const f = first?.trim();
  const l = last?.trim();
  if (!f) return "Player";
  return l ? `${f} ${l[0].toUpperCase()}.` : f;
}

/** Top voters over the last 7 days. First name + last initial only. */
export async function getWeeklyRanks(meId: string | null): Promise<RankRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: votes } = await supabase
    .from("caption_votes")
    .select("profile_id")
    .gte("created_at", since);

  const counts = new Map<string, number>();
  for (const v of (votes ?? []) as { profile_id: string }[]) {
    counts.set(v.profile_id, (counts.get(v.profile_id) ?? 0) + 1);
  }

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", top.map(([id]) => id));

  const names = new Map<string, string>();
  for (const p of (profiles ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }[]) {
    names.set(p.id, displayName(p.first_name, p.last_name));
  }

  return top.map(([id, votesCount], i) => ({
    rank: i + 1,
    name: id === meId ? "You" : (names.get(id) ?? "Player"),
    votes: votesCount,
    isMe: id === meId,
  }));
}

export type FeedTab = "trending" | "new" | "top";

export type FeedRow = {
  id: number;
  image_description: string;
  caption_text: string;
  /** ms since epoch, so the client can sort without touching the clock. */
  createdMs: number;
  /** Net vote score (everyone's votes, including the user's own). */
  score: number;
  /** Net score of everyone except the signed-in user. */
  otherScore: number;
  /** Time-decayed "hot" score used by the Trending tab. */
  hot: number;
  isHot: boolean;
  isNew: boolean;
  myVote: 1 | -1 | null;
  myRecent: boolean;
};

/**
 * Turns captions + votes into plain rows the client can sort for any tab
 * instantly. All clock reads happen here (on the server), once per request.
 */
export function buildFeedRows<
  T extends {
    id: number;
    image_description: string;
    caption_text: string;
    created_at: string;
  },
>(
  captions: T[],
  scores: Map<number, number>,
  myVotes: Map<number, 1 | -1>,
  myRecent: Set<number>
): FeedRow[] {
  const now = Date.now();
  const rows = captions.map((c) => {
    const score = scores.get(c.id) ?? 0;
    const mine = myVotes.get(c.id) ?? null;
    return {
      id: c.id,
      image_description: c.image_description,
      caption_text: c.caption_text,
      createdMs: new Date(c.created_at).getTime(),
      score,
      otherScore: score - (mine ?? 0),
      hot: hotScore(score, c.created_at, now),
      isHot: false,
      isNew: now - new Date(c.created_at).getTime() < 24 * 3_600_000,
      myVote: mine,
      myRecent: myRecent.has(c.id),
    };
  });

  const hotIds = new Set(
    [...rows]
      .sort((a, b) => b.hot - a.hot || b.createdMs - a.createdMs)
      .slice(0, 2)
      .filter((r) => r.score > 0)
      .map((r) => r.id)
  );
  return rows.map((r) => ({ ...r, isHot: hotIds.has(r.id) }));
}

type VoteRow = {
  caption_id: number;
  profile_id: string;
  vote_value: number;
  created_at: string;
};

/**
 * Folds raw vote rows into per-caption scores and the current user's own
 * votes. Reads the clock (for the "voted in the last 24h" flag), so it lives
 * here rather than in a component.
 */
export function summarizeVotes(votes: VoteRow[], userId: string | null) {
  const now = Date.now();
  const scores = new Map<number, number>();
  const myVotes = new Map<number, 1 | -1>();
  const myRecent = new Set<number>();

  for (const v of votes) {
    scores.set(v.caption_id, (scores.get(v.caption_id) ?? 0) + v.vote_value);
    if (userId && v.profile_id === userId) {
      myVotes.set(v.caption_id, v.vote_value === 1 ? 1 : -1);
      if (now - new Date(v.created_at).getTime() < 24 * 3_600_000) {
        myRecent.add(v.caption_id);
      }
    }
  }

  return { scores, myVotes, myRecent };
}
