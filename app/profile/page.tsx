import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import Hud from "@/components/Hud";
import ProfileForm from "./ProfileForm";

// Protected route: Proxy already redirects signed-out visitors to /login,
// but this check is what actually gates access to this page's data — the
// framework says render-time gating alone is not a security boundary.
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/profile");
  }

  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8 sm:px-12">
      <h1 className="font-display text-4xl font-bold">Your profile</h1>
      <p className="mt-2 text-sm font-bold text-ink/75">Signed in as {user.email}</p>
      <section className="window mt-6">
        <h2 className="window-title bg-[#7ED6A4]">Level &amp; rewards</h2>
        <div className="p-4">
          <Hud className="w-full" />
          <p className="mt-3 text-xs font-bold text-ink/75">
            Each vote earns 5 EXP and 2 coins. Quests and rankings are on your dashboard.
          </p>
        </div>
      </section>

      <section className="window mt-6">
        <h2 className="window-title bg-[#7CC6F0]">Player card</h2>
        <ProfileForm
          profile={
            profile ?? { id: user.id, first_name: null, last_name: null, avatar_url: null }
          }
        />
      </section>
    </main>
  );
}
