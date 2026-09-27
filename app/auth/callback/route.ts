import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth redirect target. Keep this at exactly /auth/callback — the Google
// OAuth client and Supabase provider config must point here with no other
// path or extra baked-in query parameters.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing/invalid code, or the exchange failed — send the user back to
  // login rather than exposing internal error detail.
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
