"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  CaptionApiError,
  captionApiConfigured,
  judgeCandidates,
  lookAtPhoto,
  writeCandidates,
  type ImageMediaType,
  type MemeCaption,
  type PhotoDescription,
} from "@/lib/captionApi";
import { clip, parseCaptionList, parseDescription } from "@/lib/captionParse";
import { isTone, type Tone } from "@/lib/captionTypes";

/**
 * The meme pipeline is three Server Actions the browser calls in order
 * (look -> write -> judge). Splitting it lets the page show real progress and
 * keeps each request short. Every action authenticates and rate-limits itself
 * because Server Actions are public POST endpoints.
 */

export type LookResult = { error?: string; photo?: PhotoDescription };
export type WriteResult = { error?: string; candidates?: MemeCaption[] };
export type JudgeResult = { error?: string; captions?: MemeCaption[] };

// The browser shrinks photos before upload; Vercel also caps bodies at ~4.5MB.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_HINT_CHARS = 140;

// Best-effort abuse limit (per server instance). Free-tier quota is shared by
// everyone, so stop one user from burning it.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 12;
const recentCalls = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const calls = (recentCalls.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  const limited = calls.length >= RATE_MAX;
  if (!limited) calls.push(now);
  recentCalls.set(key, calls);
  return limited;
}

/** Decide the image type from the file's own bytes, not the client's claim. */
function sniffMediaType(bytes: Uint8Array): ImageMediaType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function friendly(e: unknown): string {
  if (e instanceof CaptionApiError) {
    if (e.code === "not_configured") {
      return "Meme generation isn't set up yet. The site owner needs to add the Gemini API key.";
    }
    if (e.code === "busy") return "The caption service is busy. Try again in a moment.";
    if (e.code === "blocked") return "The AI declined to caption that photo. Try a different one.";
  }
  console.error("[caption] step failed:", e instanceof Error ? e.message : "unknown");
  return "Couldn't generate captions. Please try again.";
}

async function gate(step: string): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return "You must be signed in to make a meme.";
  if (!captionApiConfigured()) {
    return "Meme generation isn't set up yet. The site owner needs to add the Gemini API key.";
  }
  if (rateLimited(`${step}:${user.id}`)) return "Slow down a little. Try again in a few minutes.";
  return null;
}

/** Step 1: look at the uploaded photo. */
export async function lookAtPhotoAction(formData: FormData): Promise<LookResult> {
  const blocked = await gate("look");
  if (blocked) return { error: blocked };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  if (file.size > MAX_BYTES) return { error: "That photo is too large. Try a smaller one." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = sniffMediaType(bytes);
  if (!mediaType) return { error: "Use a JPG, PNG, or WEBP photo." };

  try {
    const photo = await lookAtPhoto({
      imageBase64: Buffer.from(bytes).toString("base64"),
      mediaType,
    });
    if (!photo.safe) {
      return { error: "That photo can't be captioned. Try a different one." };
    }
    return { photo };
  } catch (e) {
    return { error: friendly(e) };
  }
}

/** Step 2: write candidate captions from the description. */
export async function writeCaptionsAction(
  photoInput: unknown,
  toneInput: string,
  hintInput: string
): Promise<WriteResult> {
  const blocked = await gate("write");
  if (blocked) return { error: blocked };

  const photo = parseDescription(photoInput);
  if (!photo || !photo.safe) return { error: "Something went wrong. Please try again." };
  const tone: Tone = isTone(toneInput) ? toneInput : "classic";
  const hint = clip(hintInput, MAX_HINT_CHARS);

  try {
    return { candidates: await writeCandidates({ photo, tone, hint }) };
  } catch (e) {
    return { error: friendly(e) };
  }
}

/** Step 3: pick and polish the best three. */
export async function judgeCaptionsAction(
  photoInput: unknown,
  candidatesInput: unknown
): Promise<JudgeResult> {
  const blocked = await gate("judge");
  if (blocked) return { error: blocked };

  const photo = parseDescription(photoInput);
  const candidates = parseCaptionList(candidatesInput, 8);
  if (!photo || !photo.safe || candidates.length === 0) {
    return { error: "Something went wrong. Please try again." };
  }

  try {
    return { captions: await judgeCandidates({ photo, candidates }) };
  } catch (e) {
    return { error: friendly(e) };
  }
}
