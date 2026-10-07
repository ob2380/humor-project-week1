import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPlayerStats, XP_PER_LEVEL } from "@/lib/game";
import { signOut } from "@/app/auth/actions";
import Mascot from "@/components/Mascot";

/** Game-style HUD: logo, level badge, EXP bar and coins (all derived from real votes). */
export default async function NavBar() {
  const user = await getCurrentUser();
  const stats = await getPlayerStats();

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b-[3px] border-ink bg-cream px-6 py-3 sm:px-12">
      <Link href="/" className="flex items-center gap-3 no-underline">
        <Mascot size={44} />
        <span className="font-display text-2xl font-bold text-[#C2410C]">
          Punchline Quest
        </span>
      </Link>

      {user && stats && (
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
                className="h-full bg-green"
                style={{ width: `${stats.expPercent}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-paper py-1 pl-1.5 pr-3 shadow-[0_3px_0_var(--ink)]">
            <span className="h-6 w-6 rounded-full border-[3px] border-ink bg-gold" />
            <span className="font-display text-lg font-semibold">
              {stats.coins}
            </span>
          </div>
        </div>
      )}

      <nav className="flex items-center gap-4 text-sm font-bold">
        {user ? (
          <>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/profile" className="hover:underline">
              Profile
            </Link>
            <form action={signOut}>
              <button type="submit" className="font-bold hover:underline">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="chunky-btn">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
