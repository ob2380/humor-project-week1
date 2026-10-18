import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentProfile, getIsSuperadmin, isProfileComplete } from "@/lib/auth";
import { getWeeklyRanks } from "@/lib/game";
import Hud from "@/components/Hud";
import Mascot from "@/components/Mascot";
import { MascotLine, QuestPanel } from "@/components/QuestPanel";
import RankingsPanel from "@/components/RankingsPanel";
import WithdrawButton from "@/components/WithdrawButton";

export const dynamic = "force-dynamic";

// Protected route: only renders for a signed-in user. Proxy redirects
// signed-out visitors before this even runs, but we check again here too.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const supabase = await createClient();
  const [profile, ranks, isAdmin, postsResult, captionCount] = await Promise.all([
    getCurrentProfile(),
    getWeeklyRanks(user.id),
    getIsSuperadmin(),
    supabase
      .from("community_posts")
      .select("id, kind, caption_text, status")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("captions")
      .select("id", { count: "exact", head: true })
      .then((r) => r.count ?? 0),
  ]);
  const complete = isProfileComplete(profile);
  const posts = (postsResult.data ?? []) as {
    id: number;
    kind: string;
    caption_text: string;
    status: "pending" | "approved" | "rejected";
  }[];
  const statusStyle = {
    pending: "bg-gold",
    approved: "bg-[#7ED6A4]",
    rejected: "bg-[#FFD6D6]",
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:px-12">
      <h1 className="font-display text-4xl font-bold">
        Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}!
      </h1>
      <p className="mt-2 text-sm font-bold text-ink/75">
        Your progress, daily quests and the weekly leaderboard.
      </p>

      {!complete && (
        <section className="window mt-6">
          <h2 className="window-title bg-gold">Finish setting up your profile</h2>
          <div className="flex flex-col items-start gap-3 p-4">
            <p className="text-sm font-bold">
              Add your first and last name so we know who you are.
            </p>
            <Link href="/profile" className="chunky-btn bg-gold">
              Complete profile
            </Link>
          </div>
        </section>
      )}

      <section className="window mt-6">
        <h2 className="window-title bg-[#7ED6A4]">Your progress</h2>
        <div className="flex flex-col gap-4 p-4">
          <Hud className="w-full" />
          <div className="flex items-start gap-3">
            <Mascot size={56} />
            <MascotLine signedIn />
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <QuestPanel signedIn captionCount={captionCount} />
        <RankingsPanel ranks={ranks} signedIn />
      </div>

      <section className="window mt-6">
        <h2 className="window-title bg-[#C9A7F5]">Your posts</h2>
        <div className="flex flex-col gap-3 p-4">
          {posts.length === 0 && (
            <p className="text-sm font-bold">
              Nothing posted yet. Make a meme and hit &quot;Post to meme page&quot;.
            </p>
          )}
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border-[3px] border-ink px-3 py-0.5 text-xs font-extrabold uppercase ${statusStyle[p.status]}`}
              >
                {p.status}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">
                {p.kind === "meme" ? "🖼️ " : ""}
                {p.caption_text}
              </span>
              {p.status !== "approved" && <WithdrawButton postId={p.id} />}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {isAdmin && (
          <Link href="/admin/review" className="chunky-btn bg-gold">
            Review posts
          </Link>
        )}
        <Link href="/" className="chunky-btn bg-gold">
          Vote on captions
        </Link>
        <Link href="/create" className="chunky-btn">
          Make a meme
        </Link>
        <Link href="/profile" className="chunky-btn">
          Edit profile
        </Link>
      </div>
    </main>
  );
}
