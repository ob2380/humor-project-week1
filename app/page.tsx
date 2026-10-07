import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  DAILY_VOTE_GOAL,
  getPlayerStats,
  getWeeklyRanks,
  organizeCaptions,
  type FeedTab,
} from "@/lib/game";
import VoteButtons from "@/components/VoteButtons";
import Mascot from "@/components/Mascot";

export const dynamic = "force-dynamic";

const TABS: { id: FeedTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "top", label: "Top" },
];

const IMAGE_TINTS = ["#CDEBC0", "#FFE0B2", "#E1D5F5", "#FFD6E0", "#BFE6FF"];

type Caption = {
  id: number;
  image_description: string;
  caption_text: string;
  created_at: string;
};

type VoteRow = {
  caption_id: number;
  profile_id: string;
  vote_value: number;
};

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const rawTab = typeof searchParams.tab === "string" ? searchParams.tab : "";
  const tab: FeedTab = rawTab === "new" || rawTab === "top" ? rawTab : "trending";

  const supabase = await createClient();
  const user = await getCurrentUser();
  const stats = await getPlayerStats();

  const [captionsResult, votesResult, ranks] = await Promise.all([
    supabase
      .from("captions")
      .select("id, image_description, caption_text, created_at"),
    supabase.from("caption_votes").select("caption_id, profile_id, vote_value"),
    user ? getWeeklyRanks(user.id) : Promise.resolve([]),
  ]);

  const error = captionsResult.error?.message ?? votesResult.error?.message ?? null;
  const captions = (captionsResult.data ?? []) as Caption[];
  const votes = (votesResult.data ?? []) as VoteRow[];

  const scores = new Map<number, number>();
  const myVotes = new Map<number, 1 | -1>();
  for (const v of votes) {
    scores.set(v.caption_id, (scores.get(v.caption_id) ?? 0) + v.vote_value);
    if (user && v.profile_id === user.id) {
      myVotes.set(v.caption_id, v.vote_value === 1 ? 1 : -1);
    }
  }

  const net = (c: Caption) => scores.get(c.id) ?? 0;
  const { ordered, hotIds, newIds } = organizeCaptions(captions, scores, tab);

  // Daily quests, derived from the signed-in user's real votes.
  const quests = stats
    ? [
        {
          name: `Vote on ${DAILY_VOTE_GOAL} captions today`,
          done: Math.min(stats.votesLast24h, DAILY_VOTE_GOAL),
          total: DAILY_VOTE_GOAL,
        },
        {
          name: "Vote on every caption on the board",
          done: Math.min(stats.totalVotes, captions.length),
          total: Math.max(captions.length, 1),
        },
      ]
    : [];

  const votesLeftToday = stats
    ? Math.max(0, DAILY_VOTE_GOAL - stats.votesLast24h)
    : 0;

  const mascotLine = !user
    ? "Sign in and vote to earn EXP and coins!"
    : stats && stats.totalVotes === 0
      ? "Cast your first vote to start leveling up!"
      : votesLeftToday > 0
        ? `${votesLeftToday} more ${votesLeftToday === 1 ? "vote" : "votes"} finishes today's quest.`
        : "Today's quest is complete. Nice work!";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-6 py-8 sm:px-12 lg:flex-row">
      {/* Left column: quests, rankings, mascot */}
      <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-80">
        <section className="window">
          <h2 className="window-title bg-orange">Daily Quests</h2>
          <div className="flex flex-col gap-4 p-4">
            {!user && (
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
                    className="h-full bg-green"
                    style={{ width: `${Math.round((q.done / q.total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {user && (
              <p className="text-xs font-bold text-ink/75">
                Each vote earns 5 EXP and 2 coins.
              </p>
            )}
          </div>
        </section>

        <section className="window">
          <h2 className="window-title bg-[#7CC6F0]">Weekly Rankings</h2>
          {user ? (
            ranks.length > 0 ? (
              <ol className="m-0 flex list-none flex-col gap-2 p-3">
                {ranks.map((r) => (
                  <li
                    key={r.rank}
                    className={`flex items-center gap-2 rounded-[10px] border-[3px] border-ink px-3 py-2 ${
                      r.isMe ? "bg-[#FFE08A]" : "bg-paper"
                    }`}
                  >
                    <span className="w-7 font-display text-lg font-bold">
                      {r.rank}
                    </span>
                    <span className="flex-1 text-[15px] font-extrabold">
                      {r.name}
                    </span>
                    <span className="text-sm font-bold">
                      {r.votes} {r.votes === 1 ? "vote" : "votes"}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-4 text-sm font-bold">
                No votes this week yet. Be the first on the board!
              </p>
            )
          ) : (
            <p className="p-4 text-sm font-bold">Sign in to see the rankings.</p>
          )}
        </section>

        <section className="flex items-start gap-3">
          <Mascot size={64} />
          <div className="relative rounded-[14px] border-[3px] border-ink bg-paper px-3.5 py-3 text-sm font-bold leading-snug shadow-[0_3px_0_var(--ink)]">
            <div className="absolute -left-2.5 top-5 h-3.5 w-3.5 rotate-45 border-b-[3px] border-l-[3px] border-ink bg-paper" />
            {mascotLine}
          </div>
        </section>
      </aside>

      {/* Main column: tabs + caption cards */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <nav aria-label="Caption lists" className="flex flex-wrap gap-2.5">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.id === "trending" ? "/" : `/?tab=${t.id}`}
              aria-current={t.id === tab ? "page" : undefined}
              className={`chunky-btn ${t.id === tab ? "is-tab-active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <section className="window p-5">
          {error && (
            <p className="mb-4 rounded-md border-[3px] border-ink bg-[#FFD6D6] p-3 text-sm font-bold">
              Couldn&apos;t load captions: {error}
            </p>
          )}

          {!error && ordered.length === 0 && (
            <p className="text-sm font-bold">No captions yet.</p>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {ordered.map((caption) => {
              const isHot = hotIds.has(caption.id);
              const tag = isHot ? "HOT" : newIds.has(caption.id) ? "NEW" : null;

              return (
                <article
                  key={caption.id}
                  className="overflow-hidden rounded-[14px] border-[3px] border-ink bg-white shadow-[0_4px_0_var(--ink)]"
                >
                  <div
                    className="relative flex h-36 items-center justify-center border-b-[3px] border-ink px-6 text-center text-xs font-extrabold uppercase tracking-[0.08em]"
                    style={{
                      background: IMAGE_TINTS[caption.id % IMAGE_TINTS.length],
                    }}
                  >
                    {tag && (
                      <span
                        className={`absolute left-3 top-3 rounded-full border-[3px] border-ink px-3 py-0.5 font-display text-sm font-bold tracking-wide ${
                          tag === "HOT" ? "bg-orange" : "bg-[#7ED6A4]"
                        }`}
                      >
                        {tag}
                      </span>
                    )}
                    <span>{caption.image_description}</span>
                  </div>
                  <div className="flex flex-col gap-3 p-4">
                    <p className="font-display text-[21px] font-semibold leading-tight">
                      {caption.caption_text}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex items-center gap-2 font-display text-xl font-semibold"
                        aria-label={`Score ${net(caption)}`}
                      >
                        <span className="h-[22px] w-[22px] rounded-full border-[3px] border-ink bg-gold" />
                        <span>{net(caption)}</span>
                      </div>
                      <VoteButtons
                        captionId={caption.id}
                        signedIn={Boolean(user)}
                        initialVote={myVotes.get(caption.id) ?? null}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
