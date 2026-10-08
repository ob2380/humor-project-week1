"use client";

import { useGame } from "@/components/GameProvider";
import { XP_PER_LEVEL } from "@/lib/gameMath";

/** Level badge, EXP bar and coin counter. Updates instantly as you vote. */
export default function Hud() {
  const { stats } = useGame();
  if (!stats) return null;

  return (
    <div className="flex min-w-[260px] max-w-md flex-1 items-center gap-3">
      <div
        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-ink bg-gold font-display leading-none shadow-[0_3px_0_var(--ink)]"
        aria-label={`Level ${stats.level}`}
      >
        <span className="text-[11px] font-semibold">LV</span>
        <span className="text-xl font-bold">{stats.level}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex justify-between text-xs font-extrabold">
          <span>EXP</span>
          <span>
            {stats.expIntoLevel} / {XP_PER_LEVEL}
          </span>
        </div>
        <div
          className="h-4 overflow-hidden rounded-full border-[3px] border-ink bg-track"
          role="progressbar"
          aria-label="Experience toward next level"
          aria-valuemin={0}
          aria-valuemax={XP_PER_LEVEL}
          aria-valuenow={stats.expIntoLevel}
        >
          <div
            className="h-full bg-green transition-[width] duration-300"
            style={{ width: `${stats.expPercent}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-paper py-1 pl-1.5 pr-3 shadow-[0_3px_0_var(--ink)]">
        <span className="h-6 w-6 rounded-full border-[3px] border-ink bg-gold" />
        <span className="font-display text-lg font-semibold">{stats.coins}</span>
      </div>
    </div>
  );
}
