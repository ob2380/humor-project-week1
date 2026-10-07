"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitVote } from "@/app/vote/actions";

type Props = {
  captionId: number;
  signedIn: boolean;
  initialVote: 1 | -1 | null;
};

export default function VoteButtons({ captionId, signedIn, initialVote }: Props) {
  const [myVote, setMyVote] = useState<1 | -1 | null>(initialVote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Logged-out visitors can't rate captions.
  if (!signedIn) {
    return (
      <Link href="/login?next=/" className="text-sm text-gray-500 underline">
        Sign in to vote
      </Link>
    );
  }

  function vote(value: 1 | -1) {
    setError(null);
    startTransition(async () => {
      const result = await submitVote(captionId, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMyVote(value);
    });
  }

  const hasVoted = myVote !== null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => vote(1)}
          disabled={pending || hasVoted}
          aria-label="Upvote"
          aria-pressed={myVote === 1}
          className={`rounded-md border px-3 py-1 text-sm transition disabled:cursor-not-allowed ${
            myVote === 1
              ? "border-green-600 bg-green-50 text-green-700"
              : "border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          }`}
        >
          ▲ Up
        </button>
        <button
          type="button"
          onClick={() => vote(-1)}
          disabled={pending || hasVoted}
          aria-label="Downvote"
          aria-pressed={myVote === -1}
          className={`rounded-md border px-3 py-1 text-sm transition disabled:cursor-not-allowed ${
            myVote === -1
              ? "border-red-600 bg-red-50 text-red-700"
              : "border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          }`}
        >
          ▼ Down
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
