import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { buildFeedRows, summarizeVotes, type FeedTab } from "@/lib/game";
import Feed from "@/components/Feed";
import { communityImageUrl } from "@/lib/community";

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
  const tab: FeedTab = rawTab === "new" || rawTab === "top" || rawTab === "community" ? rawTab : "trending";

  const supabase = await createClient();
  const user = await getCurrentUser();

  const [captionsResult, votesResult, postsResult] = await Promise.all([
    supabase
      .from("captions")
      .select("id, image_description, caption_text, created_at"),
    supabase
      .from("caption_votes")
      .select("caption_id, profile_id, vote_value, created_at"),
    supabase
      .from("community_posts")
      .select("caption_id, image_path")
      .eq("status", "approved")
      .not("caption_id", "is", null),
  ]);

  const error = captionsResult.error?.message ?? votesResult.error?.message ?? null;
  const captions = (captionsResult.data ?? []) as Caption[];
  const votes = (votesResult.data ?? []) as VoteRow[];

  const { scores, myVotes, myRecent } = summarizeVotes(votes, user?.id ?? null);
  const community = new Map<number, string | null>();
  for (const p of (postsResult.data ?? []) as { caption_id: number; image_path: string | null }[]) {
    community.set(p.caption_id, p.image_path ? communityImageUrl(p.image_path) : null);
  }
  const rows = buildFeedRows(captions, scores, myVotes, myRecent, community);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-8 sm:px-12">
      <Feed rows={rows} initialTab={tab} signedIn={Boolean(user)} error={error} />
    </main>
  );
}
