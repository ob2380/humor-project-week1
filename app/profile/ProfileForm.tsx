"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileActionState } from "./actions";
import type { Profile } from "@/lib/auth";

const initialState: ProfileActionState = {};

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="Your profile photo"
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
            No photo
          </div>
        )}
        <div>
          <label htmlFor="avatar" className="block text-sm font-medium">
            Profile photo
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="mt-1 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="first_name" className="block text-sm font-medium">
          First name
        </label>
        <input
          id="first_name"
          name="first_name"
          type="text"
          defaultValue={profile.first_name ?? ""}
          maxLength={100}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="last_name" className="block text-sm font-medium">
          Last name
        </label>
        <input
          id="last_name"
          name="last_name"
          type="text"
          defaultValue={profile.last_name ?? ""}
          maxLength={100}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Profile saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
