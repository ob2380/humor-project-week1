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
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
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
