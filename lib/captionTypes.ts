/** Types and constants shared by the browser and the server (no secrets). */

export const THEMES = {
  sunny: { label: "Sunny", from: "#FFE066", to: "#FF9F1C" },
  ocean: { label: "Ocean", from: "#7CC6F0", to: "#2563EB" },
  mint: { label: "Mint", from: "#B8F2D0", to: "#2BB673" },
  grape: { label: "Grape", from: "#D8B4FE", to: "#7C3AED" },
  night: { label: "Night", from: "#4338CA", to: "#1E1B4B" },
  coral: { label: "Coral", from: "#FFB4A2", to: "#EF476F" },
} as const;

export type ThemeId = keyof typeof THEMES;

export function isTheme(value: string): value is ThemeId {
  return Object.prototype.hasOwnProperty.call(THEMES, value);
}

/** emoji + theme are only used for "idea" memes, which have no photo. */
export type MemeCaption = { top: string; bottom: string; emoji?: string; theme?: ThemeId };

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

/**
 * What the writer is told about the meme: either what step 1 (the "eyes")
 * saw in a photo, or an idea the user typed (kind = "idea").
 */
export type PhotoDescription = {
  kind: "photo" | "idea";
  description: string;
  subjects: string[];
  mood: string;
  setting: string;
  visibleText: string;
  memeAngle: string;
  safe: boolean;
};

export const TONES = {
  classic: {
    label: "Classic",
    prompt: "classic meme humor: relatable, punchy, setup on top and punchline on the bottom",
  },
  dry: {
    label: "Dry",
    prompt: "deadpan and dry, understated, like a tired narrator",
  },
  absurd: {
    label: "Absurd",
    prompt: "absurd and surreal, with an unexpected twist",
  },
  campus: {
    label: "Campus life",
    prompt: "college student life: all-nighters, dining hall food, group projects, finals stress",
  },
  wholesome: {
    label: "Wholesome",
    prompt: "wholesome and warm, gently funny",
  },
} as const;

export type Tone = keyof typeof TONES;

export function isTone(value: string): value is Tone {
  return Object.prototype.hasOwnProperty.call(TONES, value);
}
