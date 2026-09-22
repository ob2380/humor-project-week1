import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type Caption = {
  id: number;
  image_description: string;
  caption_text: string;
  votes: number;
  created_at: string;
};

async function getCaptions(): Promise<{ data: Caption[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("captions")
    .select("*")
    .order("votes", { ascending: false });

  return { data, error: error?.message ?? null };
}

export default async function Home() {
  const { data: captions, error } = await getCaptions();

  return (
    <main className="min-h-screen px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold">Captions</h1>
        <p className="mt-2 text-sm text-gray-500">
          Live from Supabase — top captions by votes.
        </p>

        {error && (
          <p className="mt-8 rounded-md bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load captions: {error}
          </p>
        )}

        {!error && (!captions || captions.length === 0) && (
          <p className="mt-8 text-sm text-gray-500">No captions yet.</p>
        )}

        <ul className="mt-8 flex flex-col gap-4">
          {captions?.map((caption) => (
            <li
              key={caption.id}
              className="rounded-xl border border-gray-200 p-5 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">
                {caption.image_description}
              </p>
              <p className="mt-2 text-lg font-medium">{caption.caption_text}</p>
              <p className="mt-3 text-sm text-gray-500">
                {caption.votes} votes
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
