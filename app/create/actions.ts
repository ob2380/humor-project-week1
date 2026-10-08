"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  CaptionApiError,
  generateMemeCaptions,
  isTone,
  type ImageMediaType,
  type MemeCaption,
} from "@/lib/captionApi";

export type GenerateResult = {
  error?: string;
  captions?: MemeCaption[];
};

// The browser shrinks photos before upload, so real requests are far below
// this. Vercel also caps request bodies at ~4.5MB.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_HINT_CHARS = 140;

// Best-effort abuse limit (per server instance). Every call costs real money,
// so cap how often one user can generate.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 10;
const recentCalls = new Map<string, number[]>();

function rateLimited(userId: string) {
  const now = Date.now();
  const calls = (recentCalls.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (calls.length >= RATE_MAX) {
    recentCalls.set(userId, calls);
    return true;
  }
  calls.push(now);
  recentCalls.set(userId, calls);
  return false;
}

/** Decide the image type from the file's own bytes, not the client's claim. */
function sniffMediaType(bytes: Uint8Array): ImageMediaType | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
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

export async function generateCaptionsAction(formData: FormData): Promise<GenerateResult> {
  // Server Actions are public POST endpoints: authenticate here too.
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to make a meme." };
  }

  if (rateLimited(user.id)) {
    return { error: "Slow down a little. Try again in a few minutes." };
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That photo is too large. Try a smaller one." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = sniffMediaType(bytes);
  if (!mediaType) {
    return { error: "Use a JPG, PNG, or WEBP photo." };
  }

  const toneRaw = String(formData.get("tone") ?? "classic");
  const tone = isTone(toneRaw) ? toneRaw : "classic";
  const hint = String(formData.get("hint") ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_HINT_CHARS);

  try {
    const captions = await generateMemeCaptions({
      imageBase64: Buffer.from(bytes).toString("base64"),
      mediaType,
      tone,
      hint,
    });
    return { captions };
  } catch (e) {
    if (e instanceof CaptionApiError) {
      if (e.code === "not_configured") {
        return {
          error:
            "Meme generation isn't set up yet. The site owner needs to add the caption API key.",
        };
      }
      if (e.code === "busy") {
        return { error: "The caption service is busy. Try again in a moment." };
      }
    }
    return { error: "Couldn't generate captions. Please try again." };
  }
}
