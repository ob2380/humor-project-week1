import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";

export default async function NavBar() {
  const user = await getCurrentUser();

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sm:px-12">
      <Link href="/" className="text-sm font-semibold">
        Humor Project
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/profile" className="hover:underline">
              Profile
            </Link>
            <form action={signOut}>
              <button type="submit" className="hover:underline">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="hover:underline">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
