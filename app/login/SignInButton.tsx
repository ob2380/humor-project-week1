"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next) redirectTo.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser is redirected to Google, then back to
    // /auth/callback — no further client-side action needed.
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="chunky-btn w-full justify-center bg-gold"
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" className="rounded-[10px] border-[3px] border-ink bg-[#FFD6D6] p-3 text-sm font-bold">
          {error}
        </p>
      )}
    </div>
  );
}
