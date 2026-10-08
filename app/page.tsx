import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { buildFeedRows, getWeeklyRanks, summarizeVotes, type FeedTab } from "@/lib/game";
import Feed from "@/components/Feed";
import Mascot from "@/components/Mascot";
import { MascotLine, QuestPanel } from "@/components/QuestPanel";

export const dynamic = "force-dynamic";

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
  created_at: string;
};

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const rawTab = typeof searchParams.tab === "string" ? searchParams.tab : "";
  const tab: FeedTab = rawTab === "new" || rawTab === "top" ? rawTab : "trending";

  const supabase = await createClient();
  const user = await getCurrentUser();

  const [captionsResult, votesResult, ranks] = await Promise.all([
    supabase
      .from("captions")
      .select("id, image_description, caption_text, created_at"),
    supabase
      .from("caption_votes")
      .select("caption_id, profile_id, vote_value, created_at"),
    user ? getWeeklyRanks(user.id) : Promise.resolve([]),
  ]);

  const error = captionsResult.error?.message ?? votesResult.error?.message ?? null;
  const captions = (captionsResult.data ?? []) as Caption[];
  const votes = (votesResult.data ?? []) as VoteRow[];

  const { scores, myVotes, myRecent } = summarizeVotes(votes, user?.id ?? null);
  const rows = buildFeedRows(captions, scores, myVotes, myRecent);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-6 py-8 sm:px-12 lg:flex-row">
      {/* Left column: quests, rankings, mascot */}
      <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-80">
        <QuestPanel signedIn={Boolean(user)} captionCount={captions.length} />

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
          <MascotLine signedIn={Boolean(user)} />
        </section>
      </aside>

      {/* Main column: tabs + caption cards (tabs switch client-side) */}
      <Feed rows={rows} initialTab={tab} signedIn={Boolean(user)} error={error} />
    </main>
  );
}
