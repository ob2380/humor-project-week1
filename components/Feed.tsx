"use client";

import Link from "next/link";
import { memo, useMemo, useRef, useState } from "react";
import VoteButtons from "@/components/VoteButtons";
import type { FeedRow, FeedTab } from "@/lib/game";

const TABS: { id: FeedTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "top", label: "Top" },
  { id: "community", label: "Community" },
];

const IMAGE_TINTS = ["#CDEBC0", "#FFE0B2", "#E1D5F5", "#FFD6E0", "#BFE6FF"];

function sortRows(rows: FeedRow[], tab: FeedTab) {
  const byNewest = (a: FeedRow, b: FeedRow) => b.createdMs - a.createdMs;
  const copy = [...rows];
  if (tab === "community") return copy.filter((r) => r.community).sort(byNewest);
  if (tab === "new") return copy.sort(byNewest);
  if (tab === "top") return copy.sort((a, b) => b.score - a.score || byNewest(a, b));
  return copy.sort((a, b) => b.hot - a.hot || byNewest(a, b));
}

/**
 * One caption card. Memoized so switching tabs only moves existing cards
 * around instead of re-rendering every card (the admin account sees 30+).
 */
const CaptionCard = memo(function CaptionCard({
  c,
  signedIn,
}: {
  c: FeedRow;
  signedIn: boolean;
}) {
  const tag = c.isHot ? "HOT" : c.isNew ? "NEW" : null;
  return (
    <article className="overflow-hidden rounded-[14px] border-[3px] border-ink bg-white shadow-[0_4px_0_var(--ink)] [contain-intrinsic-size:auto_300px] [content-visibility:auto]">
      <div
        className={`relative flex ${c.imageUrl ? "h-64" : "h-36"} items-center justify-center border-b-[3px] border-ink px-6 text-center text-xs font-extrabold uppercase tracking-[0.08em]`}
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
        {c.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.imageUrl}
            alt={c.caption_text}
            loading="lazy"
            className="absolute inset-0 h-full w-full bg-white object-contain"
          />
        ) : (
          <span>{c.image_description}</span>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <p className="font-display text-[21px] font-semibold leading-tight">{c.caption_text}</p>
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
});

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

  const listRef = useRef<HTMLDivElement>(null);

  function choose(next: FeedTab) {
    if (next === tab) return;
    setTab(next);
    // Replay a quick fade on the list. Done with a class toggle (not a React
    // key) so each card keeps its vote state when the tab changes.
    const list = listRef.current;
    if (list) {
      list.classList.remove("feed-swap");
      void list.offsetWidth;
      list.classList.add("feed-swap");
    }
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
            // Mouse users switch on press (not release), which feels ~100ms
            // faster. Keyboard and touch still use onClick.
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button === 0) choose(t.id);
            }}
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
          <p className="text-sm font-bold">
            {tab === "community"
              ? "No community posts yet. Make a meme and post it!"
              : "No captions yet."}
          </p>
        )}

        <div ref={listRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {ordered.map((c) => (
            <CaptionCard key={c.id} c={c} signedIn={signedIn} />
          ))}
        </div>
      </section>
    </div>
  );
}
