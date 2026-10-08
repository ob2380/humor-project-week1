import "server-only";
import { extractJson, parseCaptionList, parseDescription } from "./captionParse";
import {
  LOOK_PROMPT,
  LOOK_SYSTEM,
  MODELS,
  judgePrompt,
  judgeSystem,
  writePrompt,
  writeSystem,
  type StepId,
} from "./captionPrompts";
import type { ImageMediaType, MemeCaption, PhotoDescription, Tone } from "./captionTypes";

/**
 * The ONLY file that talks to the AI provider (Google Gemini, free tier).
 * The key comes from a server-only env var (no NEXT_PUBLIC_ prefix), so it
 * never reaches the browser, and is sent in a header, never in a URL.
 */

export type { ImageMediaType, MemeCaption, PhotoDescription, Tone };

export class CaptionApiError extends Error {
  constructor(
    public code: "not_configured" | "busy" | "blocked" | "failed",
    message: string
  ) {
    super(message);
  }
}

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function captionApiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function modelFor(step: StepId) {
  const override = process.env[`GEMINI_MODEL_${step.toUpperCase()}`];
  return override && /^[\w.-]+$/.test(override) ? override : MODELS[step];
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

async function callGemini(opts: {
  step: StepId;
  system: string;
  parts: Part[];
  temperature: number;
}): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new CaptionApiError("not_configured", "GEMINI_API_KEY is not set");

  let res: Response;
  try {
    res = await fetch(`${BASE}/${modelFor(opts.step)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: opts.parts }],
        generationConfig: {
          temperature: opts.temperature,
          // Generous: newer models may spend part of this "thinking".
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new CaptionApiError("failed", `${opts.step}: request failed or timed out`);
  }

  if (!res.ok) {
    // Status only: never log the key, the prompt, or the image.
    console.error(`[caption:${opts.step}] Gemini returned`, res.status);
    throw new CaptionApiError(
      res.status === 429 || res.status === 503 ? "busy" : "failed",
      `${opts.step}: Gemini returned ${res.status}`
    );
  }

  const data = (await res.json()) as {
    promptFeedback?: { blockReason?: string };
    candidates?: {
      finishReason?: string;
      content?: { parts?: { text?: string; thought?: boolean }[] };
    }[];
  };

  if (data.promptFeedback?.blockReason) {
    throw new CaptionApiError("blocked", `${opts.step}: blocked (${data.promptFeedback.blockReason})`);
  }
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "PROHIBITED_CONTENT") {
    throw new CaptionApiError("blocked", `${opts.step}: blocked (${candidate.finishReason})`);
  }

  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  const json = extractJson(text);
  if (json === null) throw new CaptionApiError("failed", `${opts.step}: reply was not JSON`);
  return json;
}

/** Step 1: the photo -> a structured description. */
export async function lookAtPhoto(input: {
  imageBase64: string;
  mediaType: ImageMediaType;
}): Promise<PhotoDescription> {
  const json = await callGemini({
    step: "look",
    system: LOOK_SYSTEM,
    // Text first, then the image (Google's recommendation for one image).
    parts: [
      { text: LOOK_PROMPT },
      { inlineData: { mimeType: input.mediaType, data: input.imageBase64 } },
    ],
    temperature: 0.2,
  });
  const photo = parseDescription(json);
  if (!photo) throw new CaptionApiError("failed", "look: no usable description");
  return photo;
}

/** Step 2: the description -> several candidate captions. */
export async function writeCandidates(input: {
  photo: PhotoDescription;
  tone: Tone;
  hint: string;
}): Promise<MemeCaption[]> {
  const json = await callGemini({
    step: "write",
    system: writeSystem(input.photo.kind),
    parts: [{ text: writePrompt(input.photo, input.tone, input.hint) }],
    temperature: 1,
  });
  const list = parseCaptionList((json as { candidates?: unknown })?.candidates, 8);
  if (list.length === 0) throw new CaptionApiError("failed", "write: no usable captions");
  return list;
}

/** Step 3: candidates -> the best three, polished. */
export async function judgeCandidates(input: {
  photo: PhotoDescription;
  candidates: MemeCaption[];
}): Promise<MemeCaption[]> {
  const json = await callGemini({
    step: "judge",
    system: judgeSystem(input.photo.kind),
    parts: [{ text: judgePrompt(input.photo, input.candidates) }],
    temperature: 0.3,
  });
  const picks = parseCaptionList((json as { captions?: unknown })?.captions, 3);
  if (picks.length === 0) throw new CaptionApiError("failed", "judge: no usable captions");
  return picks;
}
