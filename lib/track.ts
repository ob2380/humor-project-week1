/**
 * Client-side activity tracking. Sends one small POST per interaction to
 * /api/track, which records it under the signed-in user's own login.
 * Fire-and-forget: tracking never blocks or breaks the UI.
 */
export type TrackType =
  | "page_view"
  | "heartbeat"
  | "vote"
  | "vote_cancel"
  | "meme_generated"
  | "meme_downloaded"
  | "meme_deleted"
  | "post_submitted"
  | "post_withdrawn";

type Extra = {
  caption_id?: number;
  meta?: Record<string, string | number | boolean>;
};

const KEY = "hp_session";
const IDLE_MS = 30 * 60 * 1000;

function currentSession(): { id: string; first: boolean } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const now = Date.now();
    if (raw) {
      const s = JSON.parse(raw) as { id: string; last: number };
      if (s.id && now - s.last < IDLE_MS) {
        sessionStorage.setItem(KEY, JSON.stringify({ id: s.id, last: now }));
        return { id: s.id, first: false };
      }
    }
    const id = crypto.randomUUID();
    sessionStorage.setItem(KEY, JSON.stringify({ id, last: now }));
    return { id, first: true };
  } catch {
    return null; // storage blocked: skip tracking rather than guess
  }
}

export function track(type: TrackType, extra: Extra = {}) {
  if (typeof window === "undefined") return;
  const session = currentSession();
  if (!session) return;
  const body = JSON.stringify({
    session_id: session.id,
    first: session.first,
    type,
    path: window.location.pathname,
    referrer: session.first ? document.referrer.slice(0, 300) : undefined,
    caption_id: extra.caption_id,
    meta: extra.meta,
  });
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
