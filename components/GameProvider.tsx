"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { statsFromVotes, type PlayerStats } from "@/lib/gameMath";

export type VoteDelta = { total: number; recent: number };

type GameContextValue = {
  /** The player's stats, including any vote that is still being saved. */
  stats: PlayerStats | null;
  /** Instantly applies a change. Returns an undo function for failed saves. */
  applyDelta: (delta: VoteDelta) => () => void;
};

const GameContext = createContext<GameContextValue>({
  stats: null,
  applyDelta: () => () => {},
});

function apply(current: PlayerStats | null, d: VoteDelta) {
  if (!current) return current;
  return statsFromVotes(
    Math.max(0, current.totalVotes + d.total),
    Math.max(0, current.votesLast24h + d.recent)
  );
}

/**
 * Holds the player's stats in plain client state. Votes update it instantly
 * and never wait on (or trigger) a server re-render; the server value is only
 * adopted when the layout itself re-renders (sign in/out).
 */
export function GameProvider({
  initial,
  children,
}: {
  initial: PlayerStats | null;
  children: ReactNode;
}) {
  const [stats, setStats] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setStats(initial);
  }

  function applyDelta(delta: VoteDelta) {
    setStats((cur) => apply(cur, delta));
    return () =>
      setStats((cur) => apply(cur, { total: -delta.total, recent: -delta.recent }));
  }

  return (
    <GameContext.Provider value={{ stats, applyDelta }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
