import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const TYPES = new Set([
  "page_view",
  "heartbeat",
  "vote",
  "vote_cancel",
  "meme_generated",
  "meme_downloaded",
  "meme_deleted",
  "post_submitted",
  "post_withdrawn",
]);
const META_KEYS = new Set(["value", "mode", "with_image"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Best-effort per-instance limit: 120 events per minute per user.
const WINDOW_MS = 60_000;
const MAX_CALLS = 120;
const recent = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const calls = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  const hit = calls.length >= MAX_CALLS;
  if (!hit) calls.push(now);
  recent.set(key, calls);
  return hit;
}

function cleanMeta(raw: unknown) {
  const out: Record<string, string | number | boolean> = {};
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!META_KEYS.has(k)) continue;
      if (typeof v === "string") out[k] = v.slice(0, 40);
      else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
      else if (typeof v === "boolean") out[k] = v;
    }
  }
  return out;
}

/**
 * Records one interaction for the signed-in user. Runs under that user's own
 * login, so Row Level Security (not this code) is what stops anyone from
 * writing events for someone else. Visitors who aren't signed in aren't tracked.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 204 });
  if (limited(user.id)) return new NextResponse(null, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const type = String(body.type ?? "");
  const sessionId = String(body.session_id ?? "");
  if (!TYPES.has(type) || !UUID.test(sessionId)) return new NextResponse(null, { status: 400 });

  // Paths only: never the query string, which can hold tokens or codes.
  const path = String(body.path ?? "/").split("?")[0].split("#")[0].slice(0, 300);
  if (!path.startsWith("/")) return new NextResponse(null, { status: 400 });

  const supabase = await createClient();

  const startSession = async () => {
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 300) || null : null;
    const { error } = await supabase.from("user_sessions").insert({
      id: sessionId,
      profile_id: user.id,
      user_agent: (request.headers.get("user-agent") ?? "").slice(0, 400) || null,
      landing_path: path,
      referrer,
    });
    // 23505 = session already exists, which is fine.
    return !error || error.code === "23505";
  };

  if (body.first === true) await startSession();

  if (type !== "heartbeat") {
    const captionId = Number(body.caption_id);
    const row = {
      session_id: sessionId,
      profile_id: user.id,
      event_type: type,
      path,
      caption_id: Number.isInteger(captionId) && captionId > 0 ? captionId : null,
      metadata: cleanMeta(body.meta),
    };
    let { error } = await supabase.from("user_events").insert(row);
    // The session row is missing (first request was lost, or the server restarted): create it and retry once.
    if (error && body.first !== true && (await startSession())) {
      ({ error } = await supabase.from("user_events").insert(row));
    }
    if (error) return new NextResponse(null, { status: 202 });
  }

  await supabase
    .from("user_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId);

  return new NextResponse(null, { status: 204 });
}
