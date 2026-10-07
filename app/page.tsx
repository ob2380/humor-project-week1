import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import VoteButtons from "@/components/VoteButtons";

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
};

export default async function Home() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [captionsResult, votesResult] = await Promise.all([
    supabase.from("captions").select("id, image_description, caption_text, created_at"),
    supabase.from("caption_votes").select("caption_id, profile_id, vote_value"),
  ]);

  const error = captionsResult.error?.message ?? votesResult.error?.message ?? null;
  const votes: VoteRow[] = votesResult.data ?? [];

  const scores = new Map<number, number>();
  const myVotes = new Map<number, 1 | -1>();
  for (const v of votes) {
    scores.set(v.caption_id, (scores.get(v.caption_id) ?? 0) + v.vote_value);
    if (user && v.profile_id === user.id) {
      myVotes.set(v.caption_id, v.vote_value === 1 ? 1 : -1);
    }
  }

  const captions: Caption[] = [...(captionsResult.data ?? [])].sort(
    (a, b) =>
      (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) ||
      a.created_at.localeCompare(b.created_at)
  );

  return (
    <main className="min-h-screen px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold">Captions</h1>
        <p className="mt-2 text-sm text-gray-500">
          {user
            ? "Rate each caption — click your vote again to cancel it."
            : "Sign in to rate captions."}
        </p>

        {error && (
          <p className="mt-8 rounded-md bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load captions: {error}
          </p>
        )}

        {!error && captions.length === 0 && (
          <p className="mt-8 text-sm text-gray-500">No captions yet.</p>
        )}

        <ul className="mt-8 flex flex-col gap-4">
          {captions.map((caption) => (
            <li
              key={caption.id}
              className="rounded-xl border border-gray-200 p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">
                {caption.image_description}
              </p>
              <p className="mt-2 text-lg font-medium">{caption.caption_text}</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Score: {scores.get(caption.id) ?? 0}
                </p>
                <VoteButtons
                  captionId={caption.id}
                  signedIn={Boolean(user)}
                  initialVote={myVotes.get(caption.id) ?? null}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
