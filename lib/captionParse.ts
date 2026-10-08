import { isTheme, type MemeCaption, type PhotoDescription } from "./captionTypes";

/** Pure helpers that clean up model output and anything sent by the client. */

export const MAX_LINE_CHARS = 80;

export function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Finds the first {...} block in a model reply and parses it, or null. */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function asRecord(input: unknown): Record<string, unknown> | null {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

export function parseDescription(input: unknown): PhotoDescription | null {
  const o = asRecord(input);
  if (!o) return null;
  const description = clip(o.description, 500);
  if (!description) return null;
  return {
    kind: o.kind === "idea" ? "idea" : "photo",
    description,
    subjects: Array.isArray(o.subjects)
      ? o.subjects.map((s) => clip(s, 60)).filter(Boolean).slice(0, 6)
      : [],
    mood: clip(o.mood, 80),
    setting: clip(o.setting, 120),
    visibleText: clip(o.visibleText, 200),
    memeAngle: clip(o.memeAngle, 240),
    safe: o.safe !== false,
  };
}

// Built with RegExp() so it works whatever the TypeScript target is.
const EMOJI_RE = new RegExp(
  "\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier}|\\u200D\\p{Extended_Pictographic})*",
  "u"
);

function parseEmoji(value: unknown): string | undefined {
  return typeof value === "string" ? value.match(EMOJI_RE)?.[0] : undefined;
}

function parseTheme(value: unknown) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return isTheme(v) ? v : undefined;
}

export function parseCaptionList(input: unknown, max: number): MemeCaption[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: MemeCaption[] = [];
  for (const item of input) {
    const o = asRecord(item);
    if (!o) continue;
    const top = clip(o.top, MAX_LINE_CHARS);
    const bottom = clip(o.bottom, MAX_LINE_CHARS);
    if (!top && !bottom) continue;
    const key = `${top}|${bottom}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const emoji = parseEmoji(o.emoji);
    const theme = parseTheme(o.theme);
    out.push({
      top,
      bottom,
      ...(emoji ? { emoji } : {}),
      ...(theme ? { theme } : {}),
    });
    if (out.length >= max) break;
  }
  return out;
}
