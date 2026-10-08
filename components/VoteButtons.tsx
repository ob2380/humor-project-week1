"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { submitVote } from "@/app/vote/actions";
import { useGame } from "@/components/GameProvider";

type Vote = 1 | -1 | null;

type Props = {
  captionId: number;
  signedIn: boolean;
  /** The signed-in user's saved vote on this caption, if any. */
  initialVote: Vote;
  /** True if that saved vote was cast in the last 24 hours. */
  initialRecent: boolean;
  /** Everyone else's net score (the total minus the user's own vote). */
  otherScore: number;
};

function Score({ value }: { value: number }) {
  return (
    <div
      className="flex items-center gap-2 font-display text-xl font-semibold"
      aria-label={`Score ${value}`}
    >
      <span className="h-[22px] w-[22px] rounded-full border-[3px] border-ink bg-gold" />
      <span>{value}</span>
    </div>
  );
}

export default function VoteButtons({
  captionId,
  signedIn,
  initialVote,
  initialRecent,
  otherScore,
}: Props) {
  // The vote shown on screen. Changes the instant you click, then settles on
  // whatever the server saved (or snaps back if the save fails).
  const [myVote, setMyVote] = useState<Vote>(initialVote);
  const [seenVote, setSeenVote] = useState<Vote>(initialVote);
  const { applyDelta } = useGame();
  const [error, setError] = useState<string | null>(null);
  const castThisSession = useRef(false);
  // Adopt fresh server data when the page re-renders (e.g. sign in/out).
  if (initialVote !== seenVote) {
    setSeenVote(initialVote);
    setMyVote(initialVote);
  }

  // Logged-out visitors can't rate captions.
  if (!signedIn) {
    return (
      <>
        <Score value={otherScore} />
        <Link href="/login?next=/" className="chunky-btn">
          Sign in to vote
        </Link>
      </>
    );
  }

  // Clicking your current vote again cancels it; clicking the other arrow
  // switches your vote. The screen updates first; the server confirms after.
  function vote(value: 1 | -1) {
    setError(null);
    const current = myVote;
    const next: Vote = current === value ? null : value;
    const wasRecent = initialRecent || castThisSession.current;

    // 1) Update the screen right now.
    setMyVote(next);
    let undo = () => {};
    if (current === null) {
      undo = applyDelta({ total: 1, recent: 1 });
    } else if (next === null) {
      undo = applyDelta({ total: -1, recent: wasRecent ? -1 : 0 });
    } // a switch changes the score but not the vote count

    // 2) Save in the background; snap back only if the save fails.
    const clickedAt = performance.now();
    submitVote(captionId, value)
      .then((result) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[vote] saved ${Math.round(performance.now() - clickedAt)}ms after click`);
        }
        if (result.error) throw new Error(result.error);
        if (current === null) castThisSession.current = true;
      })
      .catch((e: unknown) => {
        setMyVote(current);
        undo();
        setError(e instanceof Error ? e.message : "Couldn't save your vote.");
      });
  }

  return (
    <>
      <Score value={otherScore + (myVote ?? 0)} />
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => vote(1)}
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
    </>
  );
}
