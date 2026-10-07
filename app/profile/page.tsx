import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
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
    <main className="min-h-screen px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">Your profile</h1>
        <p className="mt-2 text-sm text-ink/75">Signed in as {user.email}</p>
        <ProfileForm
          profile={
            profile ?? { id: user.id, first_name: null, last_name: null, avatar_url: null }
          }
        />
      </div>
    </main>
  );
}
