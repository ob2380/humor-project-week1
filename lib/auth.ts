import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

/**
 * Data Access Layer: the single place that reads "who is signed in" on the
 * server. `cache()` de-dupes calls within one request. Every protected page
 * and Server Action calls this itself rather than trusting Proxy alone —
 * render-time gating is not a security boundary on its own.
 */
export type SessionUser = { id: string; email: string | null };

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  // getClaims() verifies the session JWT's signature locally (no network
  // round trip to Supabase Auth when the project uses asymmetric signing
  // keys), so it is much faster than getUser() but just as trustworthy.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  return data;
});

export function isProfileComplete(profile: Profile | null) {
  return Boolean(profile?.first_name && profile?.last_name);
}
