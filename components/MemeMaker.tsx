"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { generateCaptionsAction } from "@/app/create/actions";
import type { MemeCaption } from "@/lib/captionApi";

const TONES = [
  { id: "classic", label: "Classic" },
  { id: "dry", label: "Dry" },
  { id: "absurd", label: "Absurd" },
  { id: "campus", label: "Campus life" },
  { id: "wholesome", label: "Wholesome" },
];

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

export default function MemeMaker({ configured }: { configured: boolean }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [tone, setTone] = useState("classic");
  const [hint, setHint] = useState("");
  const [captions, setCaptions] = useState<MemeCaption[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [top, setTop] = useState("");
  const [bottom, setBottom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw the meme whenever the photo or text changes.
  useEffect(() => {
    if (canvasRef.current && img) drawMeme(canvasRef.current, img, top, bottom);
  }, [img, top, bottom, captions]);

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
  }

  function generate() {
    if (!photo) return;
    setError(null);

    const form = new FormData();
    form.append("image", photo, "photo.jpg");
    form.append("tone", tone);
    form.append("hint", hint);

    startTransition(async () => {
      const result = await generateCaptionsAction(form);
      if (result.error || !result.captions) {
        setError(result.error ?? "Couldn't generate captions.");
        return;
      }
      setCaptions(result.captions);
      pick(result.captions, 0);
    });
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

  return (
    <div className="mt-6 flex flex-col gap-6">
      {!configured && (
        <p className="rounded-[10px] border-[3px] border-ink bg-[#FFE08A] p-3 text-sm font-bold">
          Caption generation isn&apos;t set up yet: the server is missing
          its <code>ANTHROPIC_API_KEY</code>. You can still upload a photo and
          write your own caption below.
        </p>
      )}

      {/* Step 1: photo */}
      <section className="window">
        <h2 className="window-title bg-orange">1. Pick a photo</h2>
        <div className="flex flex-col gap-4 p-4">
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
        </div>
      </section>

      {/* Step 2: style + generate */}
      {img && (
        <section className="window">
          <h2 className="window-title bg-[#7CC6F0]">2. Pick a style</h2>
          <div className="flex flex-col gap-4 p-4">
            <div role="radiogroup" aria-label="Caption style" className="flex flex-wrap gap-2.5">
              {TONES.map((t) => (
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
              Anything the captioner should know? (optional)
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
              {pending ? "Sparky is thinking..." : captions ? "Generate again" : "Generate captions"}
            </button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-[10px] border-[3px] border-ink bg-[#FFD6D6] p-3 text-sm font-bold">
          {error}
        </p>
      )}

      {/* Step 3: choose, edit, download */}
      {img && (
        <section className="window">
          <h2 className="window-title bg-[#7ED6A4]">3. Your meme</h2>
          <div className="flex flex-col gap-4 p-4">
            {captions && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-extrabold">Pick a caption:</p>
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
                  className="rounded-[10px] border-[3px] border-ink bg-paper px-3 py-2 text-sm font-bold"
                />
              </label>
            </div>

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
