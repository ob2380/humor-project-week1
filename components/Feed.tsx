"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import VoteButtons from "@/components/VoteButtons";
import type { FeedRow, FeedTab } from "@/lib/game";

const TABS: { id: FeedTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "top", label: "Top" },
];

const IMAGE_TINTS = ["#CDEBC0", "#FFE0B2", "#E1D5F5", "#FFD6E0", "#BFE6FF"];

function sortRows(rows: FeedRow[], tab: FeedTab) {
  const byNewest = (a: FeedRow, b: FeedRow) => b.createdMs - a.createdMs;
  const copy = [...rows];
  if (tab === "new") return copy.sort(byNewest);
  if (tab === "top") return copy.sort((a, b) => b.score - a.score || byNewest(a, b));
  return copy.sort((a, b) => b.hot - a.hot || byNewest(a, b));
}

/**
 * The caption list with its Trending / New / Top tabs. Tabs switch in the
 * browser (no server round trip), so they respond instantly.
 */
export default function Feed({
  rows,
  initialTab,
  signedIn,
  error,
}: {
  rows: FeedRow[];
  initialTab: FeedTab;
  signedIn: boolean;
  error: string | null;
}) {
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const ordered = useMemo(() => sortRows(rows, tab), [rows, tab]);

  function choose(next: FeedTab) {
    setTab(next);
    // Keep the URL shareable without triggering a navigation.
    window.history.replaceState(null, "", next === "trending" ? "/" : `/?tab=${next}`);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <nav aria-label="Caption lists" className="flex flex-wrap gap-2.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => choose(t.id)}
            aria-current={t.id === tab ? "page" : undefined}
            className={`chunky-btn ${t.id === tab ? "is-tab-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
        <Link
          href={signedIn ? "/create" : "/login?next=/create"}
          className="chunky-btn ml-auto bg-gold"
        >
          Make a meme
        </Link>
      </nav>

      <section className="window p-5">
        {error && (
          <p className="mb-4 rounded-md border-[3px] border-ink bg-[#FFD6D6] p-3 text-sm font-bold">
            Couldn&apos;t load captions: {error}
          </p>
        )}

        {!error && ordered.length === 0 && (
          <p className="text-sm font-bold">No captions yet.</p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {ordered.map((c) => {
            const tag = c.isHot ? "HOT" : c.isNew ? "NEW" : null;
            return (
              <article
                key={c.id}
                className="overflow-hidden rounded-[14px] border-[3px] border-ink bg-white shadow-[0_4px_0_var(--ink)]"
              >
                <div
                  className="relative flex h-36 items-center justify-center border-b-[3px] border-ink px-6 text-center text-xs font-extrabold uppercase tracking-[0.08em]"
                  style={{ background: IMAGE_TINTS[c.id % IMAGE_TINTS.length] }}
                >
                  {tag && (
                    <span
                      className={`absolute left-3 top-3 rounded-full border-[3px] border-ink px-3 py-0.5 font-display text-sm font-bold tracking-wide ${
                        tag === "HOT" ? "bg-orange" : "bg-[#7ED6A4]"
                      }`}
                    >
                      {tag}
                    </span>
                  )}
                  <span>{c.image_description}</span>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <p className="font-display text-[21px] font-semibold leading-tight">
                    {c.caption_text}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <VoteButtons
                      captionId={c.id}
                      signedIn={signedIn}
                      initialVote={c.myVote}
                      initialRecent={c.myRecent}
                      otherScore={c.otherScore}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
