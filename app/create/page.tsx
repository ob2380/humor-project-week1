import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import MemeMaker from "@/components/MemeMaker";

// Protected route: Proxy redirects signed-out visitors, and the page and the
// Server Action each check again.
export default async function CreatePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/create");
  }

  const configured = Boolean(process.env.GEMINI_API_KEY);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-12">
      <h1 className="font-display text-4xl font-bold">Make a meme</h1>
      <p className="mt-2 text-sm font-bold text-ink/75">
        Let Gemini write the jokes in AI Mode, or write everything yourself in
        &quot;I Feel Creative Enough&quot; mode.</p>
      <MemeMaker configured={configured} />
    </main>
  );
}
