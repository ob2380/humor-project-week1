import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import Mascot from "@/components/Mascot";
import Hud from "@/components/Hud";

/** Game-style top bar: logo, level/EXP/coins HUD, and navigation. */
export default async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b-[3px] border-ink bg-cream px-6 py-3 sm:px-12">
      <Link href="/" className="flex items-center gap-3 no-underline">
        <Mascot size={44} />
        <span className="font-display text-2xl font-bold text-[#C2410C]">
          The Humor Project
        </span>
      </Link>

      {user && <Hud />}

      <nav className="flex items-center gap-4 text-sm font-bold">
        {user ? (
          <>
            <Link href="/create" className="hover:underline">
              Make a meme
            </Link>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/profile" className="hover:underline">
              Profile
            </Link>
            <form action={signOut}>
              <button type="submit" className="font-bold hover:underline">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="chunky-btn">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
