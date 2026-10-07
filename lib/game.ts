import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Game layer. Everything here is DERIVED from real rows in `caption_votes` —
 * there are no separate XP/level tables to fake or tamper with:
 *   XP    = 5 per active vote (cancelling a vote removes its XP)
 *   Level = 1 + floor(XP / 100)
 *   Coins = 2 per active vote
 */
export const XP_PER_VOTE = 5;
export const COINS_PER_VOTE = 2;
export const XP_PER_LEVEL = 100;
export const DAILY_VOTE_GOAL = 3;

export type PlayerStats = {
  totalVotes: number;
  votesLast24h: number;
  xp: number;
  level: number;
  expIntoLevel: number;
  expPercent: number;
  coins: number;
};

export function statsFromVotes(total: number, last24h: number): PlayerStats {
  const xp = total * XP_PER_VOTE;
  const expIntoLevel = xp % XP_PER_LEVEL;
  return {
    totalVotes: total,
    votesLast24h: last24h,
    xp,
    level: 1 + Math.floor(xp / XP_PER_LEVEL),
    expIntoLevel,
    expPercent: Math.round((expIntoLevel / XP_PER_LEVEL) * 100),
    coins: total * COINS_PER_VOTE,
  };
}

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

/**
 * Orders captions for a tab and works out which ones get a HOT / NEW tag.
 * Lives here (not in the page component) because it reads the clock.
 */
export function organizeCaptions<T extends { id: number; created_at: string }>(
  captions: T[],
  scores: Map<number, number>,
  tab: FeedTab
) {
  const now = Date.now();
  const net = (c: T) => scores.get(c.id) ?? 0;
  const byNewest = (a: T, b: T) => b.created_at.localeCompare(a.created_at);

  const trending = [...captions].sort(
    (a, b) =>
      hotScore(net(b), b.created_at, now) - hotScore(net(a), a.created_at, now) ||
      byNewest(a, b)
  );

  const ordered =
    tab === "trending"
      ? trending
      : tab === "new"
        ? [...captions].sort(byNewest)
        : [...captions].sort((a, b) => net(b) - net(a) || byNewest(a, b));

  const hotIds = new Set(trending.slice(0, 2).filter((c) => net(c) > 0).map((c) => c.id));
  const newIds = new Set(
    captions
      .filter((c) => now - new Date(c.created_at).getTime() < 24 * 3_600_000)
      .map((c) => c.id)
  );

  return { ordered, hotIds, newIds };
}
