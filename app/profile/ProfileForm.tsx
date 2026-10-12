"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileActionState } from "./actions";
import type { Profile } from "@/lib/auth";

const initialState: ProfileActionState = {};

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="Your profile photo"
            className="h-16 w-16 rounded-full border-[3px] border-ink object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-ink bg-paper text-xs font-bold text-ink/75">
            No photo
          </div>
        )}
        <div>
          <label htmlFor="avatar" className="block text-sm font-extrabold">
            Profile photo
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="mt-1 text-sm font-bold"
          />
        </div>
      </div>

      <div>
        <label htmlFor="first_name" className="block text-sm font-extrabold">
          First name
        </label>
        <input
          id="first_name"
          name="first_name"
          type="text"
          defaultValue={profile.first_name ?? ""}
          maxLength={100}
          className="mt-1 w-full rounded-[10px] border-[3px] border-ink bg-paper px-3 py-2 text-sm font-bold"
        />
      </div>

      <div>
        <label htmlFor="last_name" className="block text-sm font-extrabold">
          Last name
        </label>
        <input
          id="last_name"
          name="last_name"
          type="text"
          defaultValue={profile.last_name ?? ""}
          maxLength={100}
          className="mt-1 w-full rounded-[10px] border-[3px] border-ink bg-paper px-3 py-2 text-sm font-bold"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-[10px] border-[3px] border-ink bg-[#FFD6D6] p-3 text-sm font-bold">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-[10px] border-[3px] border-ink bg-[#C9F0D5] p-3 text-sm font-bold">
          Profile saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="chunky-btn w-full justify-center bg-gold"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
