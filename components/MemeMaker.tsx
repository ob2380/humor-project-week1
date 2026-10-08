"use client";

import { useEffect, useRef, useState } from "react";
import {
  judgeCaptionsAction,
  lookAtPhotoAction,
  writeCaptionsAction,
} from "@/app/create/actions";
import {
  THEMES,
  TONES,
  type MemeCaption,
  type PhotoDescription,
  type ThemeId,
  type Tone,
} from "@/lib/captionTypes";

const TONE_LIST = (Object.keys(TONES) as Tone[]).map((id) => ({ id, label: TONES[id].label }));

type Stage = "look" | "write" | "judge" | null;
type Mode = "photo" | "idea";
type Approach = "ai" | "manual";
const STAGES: { id: Exclude<Stage, null>; label: string }[] = [
  { id: "look", label: "Sparky is looking at your photo..." },
  { id: "write", label: "Sparky is writing jokes..." },
  { id: "judge", label: "Sparky is picking the funniest..." },
];

const THEME_LIST = (Object.keys(THEMES) as ThemeId[]).map((id) => ({ id, label: THEMES[id].label }));
const IDEA_MIN = 3;
const IDEA_MAX = 240;
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const IDEA_SIZE = 1080;
const DEFAULT_EMOJI = "😎";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_EDGE = 1280; // longest side after shrinking, keeps uploads small
const MEME_FONT = 'Impact, "Arial Narrow Bold", "Arial Black", sans-serif';

/** Loads a File, shrinks it to MAX_EDGE, and returns the JPEG bytes + image. */
async function prepareImage(file: File): Promise<{ blob: Blob; img: HTMLImageElement }> {
  const srcUrl = URL.createObjectURL(file);
  try {
    const original = await loadImage(srcUrl);
    const scale = Math.min(1, MAX_EDGE / Math.max(original.naturalWidth, original.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(original.naturalWidth * scale);
    canvas.height = Math.round(original.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(original, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.88)
    );
    const smallUrl = URL.createObjectURL(blob);
    try {
      return { blob, img: await loadImage(smallUrl) };
    } finally {
      URL.revokeObjectURL(smallUrl);
    }
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws white outlined meme text, shrinking the font until it fits. */
function drawMemeText(
  ctx: CanvasRenderingContext2D,
  raw: string,
  width: number,
  height: number,
  position: "top" | "bottom"
) {
  const text = raw.trim().toUpperCase();
  if (!text) return;

  const pad = Math.round(width * 0.035);
  const maxWidth = width - pad * 2;
  let size = Math.round(width * 0.11);
  let lines: string[] = [];

  for (; size >= 16; size -= 2) {
    ctx.font = `${size}px ${MEME_FONT}`;
    lines = wrapLines(ctx, text, maxWidth);
    const fitsWidth = lines.every((l) => ctx.measureText(l).width <= maxWidth);
    if (lines.length <= 3 && fitsWidth) break;
  }

  const lineHeight = size * 1.08;
  const blockHeight = lines.length * lineHeight;
  const startY = position === "top" ? pad : height - pad - blockHeight;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size / 7);
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#ffffff";

  lines.forEach((l, i) => {
    const y = startY + i * lineHeight;
    ctx.strokeText(l, width / 2, y);
    ctx.fillText(l, width / 2, y);
  });
}

function drawMeme(canvas: HTMLCanvasElement, img: HTMLImageElement, top: string, bottom: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  drawMemeText(ctx, top, canvas.width, canvas.height, "top");
  drawMemeText(ctx, bottom, canvas.width, canvas.height, "bottom");
}

/** Text-only meme: gradient background, one big emoji as the "picture". */
function drawIdeaMeme(
  canvas: HTMLCanvasElement,
  theme: ThemeId,
  emoji: string,
  top: string,
  bottom: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = IDEA_SIZE;
  canvas.height = IDEA_SIZE;
  const t = THEMES[theme];
  const grad = ctx.createLinearGradient(0, 0, IDEA_SIZE, IDEA_SIZE);
  grad.addColorStop(0, t.from);
  grad.addColorStop(1, t.to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, IDEA_SIZE, IDEA_SIZE);

  if (emoji) {
    ctx.font = `${Math.round(IDEA_SIZE * 0.36)}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    ctx.fillText(emoji, IDEA_SIZE / 2, IDEA_SIZE / 2);
  }
  drawMemeText(ctx, top, IDEA_SIZE, IDEA_SIZE, "top");
  drawMemeText(ctx, bottom, IDEA_SIZE, IDEA_SIZE, "bottom");
}

export default function MemeMaker({ configured }: { configured: boolean }) {
  const [approach, setApproach] = useState<Approach>("ai");
  const [mode, setMode] = useState<Mode>("photo");
  const [idea, setIdea] = useState("");
  const [emoji, setEmoji] = useState("");
  const [theme, setTheme] = useState<ThemeId>("sunny");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [tone, setTone] = useState<Tone>("classic");
  const [hint, setHint] = useState("");
  const [captions, setCaptions] = useState<MemeCaption[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [top, setTop] = useState("");
  const [bottom, setBottom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>(null);
  const pending = stage !== null;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ideaReady = idea.trim().length >= IDEA_MIN;
  const isAi = approach === "ai";
  const hasSource = isAi && (mode === "photo" ? Boolean(img) : ideaReady);
  // AI mode: edit after captions arrive. Manual mode: edit as soon as there is a backdrop.
  const showEditor = isAi
    ? mode === "photo"
      ? Boolean(img)
      : Boolean(captions)
    : mode === "photo"
      ? Boolean(img)
      : true;
  const stages = mode === "photo" ? STAGES : STAGES.filter((st) => st.id !== "look");

  // Redraw the meme whenever the picture, theme, or text changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (mode === "photo") {
      if (img) drawMeme(canvas, img, top, bottom);
    } else {
      drawIdeaMeme(canvas, theme, emoji, top, bottom);
    }
  }, [mode, img, theme, emoji, top, bottom, captions, showEditor]);

  function switchMode(next: Mode) {
    if (next === mode || pending) return;
    setMode(next);
    setError(null);
    setCaptions(null);
    setTop("");
    setBottom("");
    setEmoji(next === "idea" && !isAi ? DEFAULT_EMOJI : "");
  }

  function switchApproach(next: Approach) {
    if (next === approach || pending) return;
    setApproach(next);
    setError(null);
    setCaptions(null);
    setTop("");
    setBottom("");
    setEmoji(next === "manual" && mode === "idea" ? DEFAULT_EMOJI : "");
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCaptions(null);
    setTop("");
    setBottom("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, or WEBP photo.");
      return;
    }
    try {
      const prepared = await prepareImage(file);
      setPhoto(prepared.blob);
      setImg(prepared.img);
    } catch {
      setError("Couldn't read that photo. Try a different one.");
    }
  }

  function pick(list: MemeCaption[], index: number) {
    setSelected(index);
    setTop(list[index].top);
    setBottom(list[index].bottom);
    if (mode === "idea") {
      setEmoji(list[index].emoji ?? "");
      if (list[index].theme) setTheme(list[index].theme);
    }
  }

  async function generate() {
    if (pending) return;
    if (mode === "photo" && !photo) return;
    if (mode === "idea" && !ideaReady) return;
    setError(null);

    try {
      // Step 1: look at the photo. An idea has nothing to look at, so the
      // typed text stands in for what the "eyes" would have seen.
      let described: PhotoDescription;
      if (mode === "photo" && photo) {
        setStage("look");
        const form = new FormData();
        form.append("image", photo, "photo.jpg");
        const looked = await lookAtPhotoAction(form);
        if (looked.error || !looked.photo) {
          setError(looked.error ?? "Couldn't read the photo.");
          return;
        }
        described = looked.photo;
      } else {
        described = {
          kind: "idea",
          description: idea.trim().slice(0, IDEA_MAX),
          subjects: [],
          mood: "",
          setting: "",
          visibleText: "",
          memeAngle: "",
          safe: true,
        };
      }

      // Step 2: write candidate captions.
      setStage("write");
      const written = await writeCaptionsAction(described, tone, hint);
      if (written.error || !written.candidates) {
        setError(written.error ?? "Couldn't write captions.");
        return;
      }

      // Step 3: pick the best. If this step fails, fall back to the first
      // three candidates rather than throwing the work away.
      setStage("judge");
      const judged = await judgeCaptionsAction(described, written.candidates);
      const final = judged.captions?.length ? judged.captions : written.candidates.slice(0, 3);

      setCaptions(final);
      pick(final, 0);
    } catch {
      setError("Couldn't generate captions. Please try again.");
    } finally {
      setStage(null);
    }
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-meme.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  const sourceLabels: Record<Mode, string> = isAi
    ? { photo: "I have a photo", idea: "I have an idea" }
    : { photo: "Use my photo", idea: "Emoji & colors" };

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Who does the work? */}
      <section className="window">
        <h2 className="window-title bg-orange">Who&apos;s making this meme?</h2>
        <div role="radiogroup" aria-label="Meme mode" className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <button
            type="button"
            role="radio"
            aria-checked={isAi}
            onClick={() => switchApproach("ai")}
            className={`chunky-btn flex-col items-start text-left ${isAi ? "is-tab-active" : ""}`}
            style={{ height: "auto", padding: "12px 14px", alignItems: "flex-start" }}
          >
            <span className="text-lg">🤖 AI Mode</span>
            <span className="text-xs font-bold normal-case">
              Gemini writes the captions for you. You pick one.
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!isAi}
            onClick={() => switchApproach("manual")}
            className={`chunky-btn flex-col items-start text-left ${!isAi ? "is-tab-active" : ""}`}
            style={{ height: "auto", padding: "12px 14px", alignItems: "flex-start" }}
          >
            <span className="text-lg">✍️ I Feel Creative Enough</span>
            <span className="text-xs font-bold normal-case">
              No AI. You write every word yourself.
            </span>
          </button>
        </div>
      </section>

      {isAi && !configured && (
        <p className="rounded-[10px] border-[3px] border-ink bg-[#FFE08A] p-3 text-sm font-bold">
          AI Mode isn&apos;t set up yet: the server is missing its <code>GEMINI_API_KEY</code>.
          Try &quot;I Feel Creative Enough&quot; instead.
        </p>
      )}

      {/* Step 1: backdrop / source */}
      <section className="window">
        <h2 className="window-title bg-[#7CC6F0]">
          {isAi ? "1. Give Gemini something to work with" : "1. Choose your picture"}
        </h2>
        <div className="flex flex-col gap-4 p-4">
          <div role="radiogroup" aria-label="Meme source" className="flex flex-wrap gap-2.5">
            {(["photo", "idea"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => switchMode(m)}
                className={`chunky-btn ${mode === m ? "is-tab-active" : ""}`}
              >
                {sourceLabels[m]}
              </button>
            ))}
          </div>

          {mode === "photo" ? (
            <>
              <label className="chunky-btn self-start cursor-pointer">
                {img ? "Choose a different photo" : "Choose a photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onFileChange}
                  className="sr-only"
                />
              </label>
              <p className="text-xs font-bold text-ink/75">
                JPG, PNG, or WEBP. Photos are shrunk in your browser before upload.
              </p>
            </>
          ) : isAi ? (
            <>
              <label className="flex flex-col gap-1 text-sm font-extrabold">
                Describe the situation or joke
                <textarea
                  value={idea}
                  maxLength={IDEA_MAX}
                  rows={3}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="e.g. opening the group project doc the night before it's due"
                  className="rounded-[10px] border-[3px] border-ink bg-paper px-3 py-2 text-sm font-bold"
                />
              </label>
              <p className="text-xs font-bold text-ink/75">
                No photo needed. Gemini writes the jokes and picks an emoji and colors.{" "}
                {idea.trim().length}/{IDEA_MAX}
              </p>
            </>
          ) : (
            <p className="text-xs font-bold text-ink/75">
              No photo? Pick your own emoji and background colors below.
            </p>
          )}
        </div>
      </section>

      {/* Step 2 (AI only): style + generate */}
      {isAi && hasSource && (
        <section className="window">
          <h2 className="window-title bg-[#C9A7F5]">2. Pick a style, then let Gemini cook</h2>
          <div className="flex flex-col gap-4 p-4">
            <div role="radiogroup" aria-label="Caption style" className="flex flex-wrap gap-2.5">
              {TONE_LIST.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={tone === t.id}
                  onClick={() => setTone(t.id)}
                  className={`chunky-btn ${tone === t.id ? "is-tab-active" : ""}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-sm font-extrabold">
              Anything Gemini should know? (optional)
              <input
                type="text"
                value={hint}
                maxLength={140}
                onChange={(e) => setHint(e.target.value)}
                placeholder="e.g. this is my roommate after finals"
                className="rounded-[10px] border-[3px] border-ink bg-paper px-3 py-2 text-sm font-bold"
              />
            </label>
            <button
              type="button"
              onClick={generate}
              disabled={pending || !configured}
              className="chunky-btn self-start bg-gold"
            >
              {pending ? "Working..." : captions ? "🤖 Generate again" : "🤖 Generate captions"}
            </button>
            {pending && (
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0" aria-live="polite">
                {stages.map((st, i) => {
                  const current = stages.findIndex((x) => x.id === stage);
                  const state = i < current ? "done" : i === current ? "active" : "todo";
                  return (
                    <li
                      key={st.id}
                      className={`text-sm font-bold ${state === "todo" ? "text-ink/40" : ""}`}
                    >
                      {state === "done" ? "✓ " : state === "active" ? "▸ " : "○ "}
                      {st.label}
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="text-xs font-bold text-ink/60">
              Captions are made with Google Gemini. Photos and text you send may be used by Google
              to improve its products, so avoid private photos of other people.
            </p>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-[10px] border-[3px] border-ink bg-[#FFD6D6] p-3 text-sm font-bold">
          {error}
        </p>
      )}

      {/* Final step: choose / write, style, download */}
      {showEditor && (
        <section className="window">
          <h2 className="window-title bg-[#7ED6A4]">
            {isAi ? "3. Your meme (edit anything)" : "2. Write your meme"}
          </h2>
          <div className="flex flex-col gap-4 p-4">
            {isAi && captions && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-extrabold">🤖 Gemini&apos;s picks. Tap one:</p>
                {captions.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pick(captions, i)}
                    aria-pressed={selected === i}
                    className={`chunky-btn justify-start text-left ${selected === i ? "is-tab-active" : ""}`}
                    style={{ minHeight: 44, height: "auto", padding: "10px 14px" }}
                  >
                    {[c.top, c.bottom].filter(Boolean).join(" / ")}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-extrabold">
                Top text
                <input
                  type="text"
                  value={top}
                  maxLength={80}
                  onChange={(e) => setTop(e.target.value)}
                  placeholder={isAi ? undefined : "The setup..."}
                  className="rounded-[10px] border-[3px] border-ink bg-paper px-3 py-2 text-sm font-bold"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-extrabold">
                Bottom text
                <input
                  type="text"
                  value={bottom}
                  maxLength={80}
                  onChange={(e) => setBottom(e.target.value)}
                  placeholder={isAi ? undefined : "...the punchline"}
                  className="rounded-[10px] border-[3px] border-ink bg-paper px-3 py-2 text-sm font-bold"
                />
              </label>
            </div>

            {mode === "idea" && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm font-extrabold">
                  Picture emoji
                  <input
                    type="text"
                    value={emoji}
                    maxLength={8}
                    onChange={(e) => setEmoji(e.target.value)}
                    className="w-28 rounded-[10px] border-[3px] border-ink bg-paper px-3 py-2 text-center text-xl"
                  />
                </label>
                <div role="radiogroup" aria-label="Background colors" className="flex flex-wrap gap-2.5">
                  {THEME_LIST.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={theme === t.id}
                      onClick={() => setTheme(t.id)}
                      className={`chunky-btn ${theme === t.id ? "is-tab-active" : ""}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef}
              aria-label="Meme preview"
              className="w-full rounded-[10px] border-[3px] border-ink bg-white"
            />

            <button type="button" onClick={download} className="chunky-btn self-start bg-gold">
              Download PNG
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
