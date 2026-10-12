import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile, isProfileComplete } from "@/lib/auth";

// Protected route: only renders for a signed-in user. Proxy redirects
// signed-out visitors before this even runs, but we check again here too.
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const profile = await getCurrentProfile();
  const complete = isProfileComplete(profile);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-12">
      <h1 className="font-display text-4xl font-bold">
        Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}!
      </h1>
      <p className="mt-2 text-sm font-bold text-ink/75">
        This page is only visible to signed-in players.
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

      {complete && (
        <section className="window mt-6">
          <h2 className="window-title bg-[#7ED6A4]">You&apos;re all set</h2>
          <p className="p-4 pb-2 text-sm font-bold text-ink/75">
            Signed in as {profile?.first_name} {profile?.last_name} ({user.email})
          </p>
          <div className="flex flex-wrap gap-2.5 p-4 pt-2">
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
        </section>
      )}
    </main>
  );
}
