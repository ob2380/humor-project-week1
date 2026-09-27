"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type ProfileActionState = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  // Proxy already redirects unauthenticated visitors away from /profile, but
  // Server Actions are their own POST endpoint and must authenticate again.
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  // Basic input validation — never trust FormData contents.
  if (firstName.length > 100 || lastName.length > 100) {
    return { error: "Names must be under 100 characters." };
  }

  const supabase = await createClient();

  let avatarUrl: string | undefined;
  const avatarFile = formData.get("avatar");

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return { error: "Photo must be under 5MB." };
    }
    if (!ALLOWED_AVATAR_TYPES.has(avatarFile.type)) {
      return { error: "Photo must be a PNG, JPEG, or WEBP image." };
    }

    // Never store the binary in Postgres — upload to Storage and keep only
    // the resulting URL. Path is scoped to the user's own folder so the
    // storage RLS policies (see supabase/migrations/0002_profiles.sql) let
    // them manage only their own file.
    const extension = avatarFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      return { error: `Photo upload failed: ${uploadError.message}` };
    }

    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { success: true };
}
