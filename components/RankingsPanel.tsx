import type { RankRow } from "@/lib/game";

/** Weekly top voters. Plain server-rendered markup, no client state. */
export default function RankingsPanel({
  ranks,
  signedIn,
}: {
  ranks: RankRow[];
  signedIn: boolean;
}) {
  return (
    <section className="window">
      <h2 className="window-title bg-[#7CC6F0]">Weekly Rankings</h2>
      {signedIn ? (
        ranks.length > 0 ? (
          <ol className="m-0 flex list-none flex-col gap-2 p-3">
            {ranks.map((r) => (
              <li
                key={r.rank}
                className={`flex items-center gap-2 rounded-[10px] border-[3px] border-ink px-3 py-2 ${
                  r.isMe ? "bg-[#FFE08A]" : "bg-paper"
                }`}
              >
                <span className="w-7 font-display text-lg font-bold">{r.rank}</span>
                <span className="flex-1 text-[15px] font-extrabold">{r.name}</span>
                <span className="text-sm font-bold">
                  {r.votes} {r.votes === 1 ? "vote" : "votes"}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="p-4 text-sm font-bold">
            No votes this week yet. Be the first on the board!
          </p>
        )
      ) : (
        <p className="p-4 text-sm font-bold">Sign in to see the rankings.</p>
      )}
    </section>
  );
}
