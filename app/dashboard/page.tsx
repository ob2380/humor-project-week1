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
    <main className="min-h-screen px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          This page is only visible to signed-in users.
        </p>

        {!complete && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-900">
              Finish setting up your profile
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Add your first and last name so we know who you are.
            </p>
            <Link
              href="/profile"
              className="mt-3 inline-block rounded-md bg-amber-900 px-4 py-2 text-sm font-medium text-white"
            >
              Complete profile
            </Link>
          </div>
        )}

        {complete && (
          <div className="mt-8 rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-600">
              Signed in as {profile?.first_name} {profile?.last_name} ({user.email})
            </p>
            <Link href="/profile" className="mt-2 inline-block text-sm underline">
              Edit profile
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
