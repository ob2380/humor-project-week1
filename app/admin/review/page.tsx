import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getIsSuperadmin } from "@/lib/auth";
import { communityImageUrl } from "@/lib/community";
import ReviewButtons from "@/components/ReviewButtons";

export const dynamic = "force-dynamic";

type Post = {
  id: number;
  kind: "caption" | "meme";
  caption_text: string;
  image_path: string | null;
  created_at: string;
  author: { first_name: string | null; last_name: string | null } | null;
};

// Admin only. Proxy requires sign-in; this page re-checks the role itself,
// and the database policies enforce it a third time.
export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/review");
  if (!(await getIsSuperadmin())) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("community_posts")
    .select("id, kind, caption_text, image_path, created_at, author:profiles(first_name, last_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const posts = (data ?? []) as unknown as Post[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-12">
      <h1 className="font-display text-4xl font-bold">Review posts</h1>
      <p className="mt-2 text-sm font-bold text-ink/75">
        {posts.length} waiting. Approved posts appear in the Community tab and the main feed.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        {posts.length === 0 && (
          <p className="window p-4 text-sm font-bold">Nothing to review. 🎉</p>
        )}
        {posts.map((p) => (
          <article key={p.id} className="window">
            <h2 className="window-title bg-gold">
              {p.kind === "meme" ? "Meme" : "Caption"} by{" "}
              {[p.author?.first_name, p.author?.last_name].filter(Boolean).join(" ") || "Player"}
            </h2>
            <div className="flex flex-col gap-3 p-4">
              {p.image_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={communityImageUrl(p.image_path)}
                  alt={p.caption_text}
                  className="max-h-96 w-full rounded-[10px] border-[3px] border-ink bg-white object-contain"
                />
              )}
              <p className="font-display text-xl font-semibold">{p.caption_text}</p>
              <ReviewButtons postId={p.id} />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
