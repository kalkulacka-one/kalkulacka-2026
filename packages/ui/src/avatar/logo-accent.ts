'use client';

import { useEffect, useState } from 'react';

export type Rgb = { r: number; g: number; b: number };

/** Small enough to sample fast, big enough that a logo's mark survives the downscale. */
const SAMPLE_SIZE = 32;
/** Below this, a colour reads as too dark to hold as a bar/ring on a dark card. */
const MIN_LUMINANCE_DARK = 0.22;
/** Above this, a colour reads as too washed-out to hold one on a light card. */
const MAX_LUMINANCE_LIGHT = 0.75;

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** ITU-R BT.709 relative luminance, 0–1. */
function luminance({ r, g, b }: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function blendToward(rgb: Rgb, target: Rgb, minLuminance: number, maxLuminance: number): Rgb {
  let current = rgb;
  for (let t = 0.05; t <= 0.85; t += 0.05) {
    current = {
      r: rgb.r + (target.r - rgb.r) * t,
      g: rgb.g + (target.g - rgb.g) * t,
      b: rgb.b + (target.b - rgb.b) * t,
    };
    const lum = luminance(current);
    if (lum >= minLuminance && lum <= maxLuminance) return current;
  }
  return current;
}

/**
 * The same colour, nudged separately for a white card and a near-black one.
 *
 * A logo's true colour is picked once and has to hold up in both themes — a
 * Piráti-style near-black mark still has to read as "a stroke" rather than
 * "gone" against the dark theme's navy card, and the rare near-white mark
 * needs the opposite treatment on the light theme.
 */
function toLightDark(rgb: Rgb): string {
  const forLight = blendToward(rgb, { r: 0, g: 0, b: 0 }, 0, MAX_LUMINANCE_LIGHT);
  const forDark = blendToward(rgb, { r: 255, g: 255, b: 255 }, MIN_LUMINANCE_DARK, 1);
  return `light-dark(${rgbToHex(forLight)}, ${rgbToHex(forDark)})`;
}

function toHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;

  return { h: h * 60, s, l };
}

type Bucket = { count: number; r: number; g: number; b: number };

function addSample(buckets: Map<number, Bucket>, key: number, rgb: Rgb): void {
  const entry = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
  entry.count++;
  entry.r += rgb.r;
  entry.g += rgb.g;
  entry.b += rgb.b;
  buckets.set(key, entry);
}

function mostCommon(buckets: Map<number, Bucket>): Rgb | undefined {
  let best: Bucket | undefined;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (!best) return undefined;
  return { r: best.r / best.count, g: best.g / best.count, b: best.b / best.count };
}

/**
 * The dominant colour in an image, biased toward its most saturated hue.
 *
 * A party mark is usually a small vivid patch inside a mostly neutral field —
 * white background, black linework — so a plain per-pixel frequency count
 * just answers "white" or "black" for almost every logo. This buckets the
 * saturated pixels by hue first and only falls back to the neutral buckets
 * (grouped by lightness) when the image genuinely has no real colour in it,
 * which is the right answer for a black-and-white mark rather than a failure
 * of the method.
 */
export function extractDominantColor(imageData: ImageData): Rgb | undefined {
  const { data } = imageData;
  const hueBuckets = new Map<number, Bucket>();
  const neutralBuckets = new Map<number, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;
    if (a < 128) continue;
    if (r > 240 && g > 240 && b > 240) continue; // the background field, not the mark

    const { h, s, l } = toHsl({ r, g, b });
    if (s > 0.18 && l > 0.12 && l < 0.9) {
      addSample(hueBuckets, Math.round(h / 15) * 15, { r, g, b });
    } else {
      addSample(neutralBuckets, Math.round(l * 10), { r, g, b });
    }
  }

  return mostCommon(hueBuckets) ?? mostCommon(neutralBuckets);
}

async function sampleImage(url: string): Promise<Rgb | undefined> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.src = url;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;

  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  // A CORS-tainted canvas throws here rather than at draw time.
  const imageData = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return extractDominantColor(imageData);
}

/** Resolved once per URL and kept around — every row for the same party shares one extraction. */
const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<void>>();

/**
 * The logo's own colour, as a `light-dark()` pair — `undefined` until it
 * resolves (or if it never does: a broken image, a host with no CORS header,
 * a logo that's fully transparent). Callers fall back to the seeded palette
 * colour for that gap, which is also what covers every party with no logo
 * at all.
 */
export function useLogoAccent(src: string | undefined): string | undefined {
  const [accent, setAccent] = useState<string | undefined>(() =>
    src ? (cache.get(src) ?? undefined) : undefined,
  );

  useEffect(() => {
    if (!src) return;

    const cached = cache.get(src);
    if (cached !== undefined) {
      setAccent(cached ?? undefined);
      return;
    }

    let cancelled = false;
    const load =
      pending.get(src) ??
      sampleImage(src)
        .then((rgb) => {
          cache.set(src, rgb ? toLightDark(rgb) : null);
        })
        .catch(() => {
          cache.set(src, null);
        })
        .finally(() => {
          pending.delete(src);
        });
    pending.set(src, load);

    load.then(() => {
      if (!cancelled) setAccent(cache.get(src) ?? undefined);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return accent;
}
