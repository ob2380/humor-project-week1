/**
 * Pure game math, shared by server code (lib/game.ts) and client components
 * (the HUD and the instant/optimistic vote updates). No server-only imports
 * here on purpose.
 *
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
