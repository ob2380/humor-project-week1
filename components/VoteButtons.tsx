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
      <Link href="/login?next=/" className="chunky-btn">
        Sign in to vote
      </Link>
    );
  }

  // Clicking your current vote again cancels it; clicking the other arrow
  // switches your vote. The server decides which, and tells us the result.
  function vote(value: 1 | -1) {
    setError(null);
    startTransition(async () => {
      const result = await submitVote(captionId, value);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMyVote(result.vote ?? null);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => vote(1)}
          disabled={pending}
          aria-label={myVote === 1 ? "Cancel upvote" : "Upvote"}
          aria-pressed={myVote === 1}
          title={myVote === 1 ? "Click again to cancel" : undefined}
          className={`chunky-btn ${myVote === 1 ? "is-up is-pressed" : ""}`}
        >
          ▲ Up
        </button>
        <button
          type="button"
          onClick={() => vote(-1)}
          disabled={pending}
          aria-label={myVote === -1 ? "Cancel downvote" : "Downvote"}
          aria-pressed={myVote === -1}
          title={myVote === -1 ? "Click again to cancel" : undefined}
          className={`chunky-btn ${myVote === -1 ? "is-down is-pressed" : ""}`}
        >
          ▼ Down
        </button>
      </div>
      {error && <p className="text-xs font-bold text-[#B71C1C]">{error}</p>}
    </div>
  );
}
