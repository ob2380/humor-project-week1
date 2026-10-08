"use client";

import Link from "next/link";
import { useGame } from "@/components/GameProvider";
import { DAILY_VOTE_GOAL } from "@/lib/gameMath";

/** Daily quests, driven by the same instant-updating state as the HUD. */
export function QuestPanel({
  signedIn,
  captionCount,
}: {
  signedIn: boolean;
  captionCount: number;
}) {
  const { stats } = useGame();

  const quests = stats
    ? [
        {
          name: `Vote on ${DAILY_VOTE_GOAL} captions today`,
          done: Math.min(stats.votesLast24h, DAILY_VOTE_GOAL),
          total: DAILY_VOTE_GOAL,
        },
        {
          name: "Vote on every caption on the board",
          done: Math.min(stats.totalVotes, captionCount),
          total: Math.max(captionCount, 1),
        },
      ]
    : [];

  return (
    <section className="window">
      <h2 className="window-title bg-orange">Daily Quests</h2>
      <div className="flex flex-col gap-4 p-4">
        {!signedIn && (
          <>
            <p className="text-sm font-bold">
              Sign in to start earning EXP and coins for every vote.
            </p>
            <Link href="/login" className="chunky-btn self-start">
              Sign in
            </Link>
          </>
        )}
        {quests.map((q) => (
          <div key={q.name} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-extrabold">{q.name}</span>
              <span className="text-[13px] font-bold">
                {q.done >= q.total ? "Complete!" : `${q.done}/${q.total}`}
              </span>
            </div>
            <div
              className="h-3.5 overflow-hidden rounded-full border-[3px] border-ink bg-track"
              role="progressbar"
              aria-label={q.name}
              aria-valuemin={0}
              aria-valuemax={q.total}
              aria-valuenow={q.done}
            >
              <div
                className="h-full bg-green transition-[width] duration-300"
                style={{ width: `${Math.round((q.done / q.total) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {signedIn && (
          <p className="text-xs font-bold text-ink/75">
            Each vote earns 5 EXP and 2 coins.
          </p>
        )}
      </div>
    </section>
  );
}

/** Sparky's speech bubble; reacts to your votes instantly. */
export function MascotLine({ signedIn }: { signedIn: boolean }) {
  const { stats } = useGame();

  const left = stats ? Math.max(0, DAILY_VOTE_GOAL - stats.votesLast24h) : 0;
  const line = !signedIn
    ? "Sign in and vote to earn EXP and coins!"
    : stats && stats.totalVotes === 0
      ? "Cast your first vote to start leveling up!"
      : left > 0
        ? `${left} more ${left === 1 ? "vote" : "votes"} finishes today's quest.`
        : "Today's quest is complete. Nice work!";

  return (
    <div className="relative rounded-[14px] border-[3px] border-ink bg-paper px-3.5 py-3 text-sm font-bold leading-snug shadow-[0_3px_0_var(--ink)]">
      <div className="absolute -left-2.5 top-5 h-3.5 w-3.5 rotate-45 border-b-[3px] border-l-[3px] border-ink bg-paper" />
      {line}
    </div>
  );
}
