import 'server-only';
import sharp from 'sharp';

/**
 * A party's accent colour, read out of its own logo — the fallback for a
 * candidate whose data carries no `color` (see `platform-data.ts`, which is
 * the only caller).
 *
 * Runs server-side, once per calculator load rather than once per visitor:
 * unlike a browser canvas read, there is no CORS concern (this is a plain
 * server-to-server fetch) and no repeated cost (the result is folded into the
 * `Candidate` the cached `loadPlatformCalculator` returns). The pixel math
 * itself has to earn a party's colour, not just report one: most marks are
 * white or transparent fields around a small vivid shape, and a plain
 * average would answer "white" for nearly all of them. Pixels that are
 * transparent, near-white, near-black, or too grey to carry a hue are
 * dropped before anything is bucketed; if too little of the logo survives
 * that filter, this gives up rather than guess.
 */

/** Small enough to decode fast; big enough that a logo's mark survives the downscale. */
const SAMPLE_SIZE = 32;
/** Pixels this transparent aren't part of the mark. */
const ALPHA_MIN = 128;
/** A channel this bright, on the darkest of the three, means "background field". */
const WHITE_MIN_CHANNEL = 235;
/** A channel this dark, on the brightest of the three, means "linework, not colour". */
const BLACK_MAX_CHANNEL = 25;
/** Below this red/green/blue spread the pixel reads as grey rather than a hue. */
const SATURATION_MIN_SPREAD = 30;
/** A logo where fewer than this fraction of pixels carry real colour yields nothing. */
const MIN_SURVIVING_RATIO = 0.05;
/** Hue buckets, 30° wide — coarse enough that anti-aliasing along a mark's edge doesn't split it. */
const HUE_BUCKET_COUNT = 12;
const HUE_BUCKET_SIZE = 360 / HUE_BUCKET_COUNT;

type Rgb = { r: number; g: number; b: number };
type Bucket = { weight: number; r: number; g: number; b: number };

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Hue (0–360) and saturation (0–1), from 0–255 channels. */
function hueSaturation(r: number, g: number, b: number): { h: number; s: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;

  return { h: h * 60, s };
}

/**
 * The dominant hue across a raw RGBA buffer, or `undefined` if the image has
 * no real colour in it (or is too small a sample to trust).
 *
 * Exported on its own so the filtering and bucketing can be unit-tested
 * against synthetic pixel arrays, without going through `sharp` or a fetch.
 */
export function dominantColorFromRgba(
  data: Uint8Array | Buffer,
  pixelCount: number,
): string | undefined {
  const buckets = new Map<number, Bucket>();
  let surviving = 0;

  for (let i = 0; i + 3 < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;
    if (a < ALPHA_MIN) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (min > WHITE_MIN_CHANNEL) continue; // background field, not the mark
    if (max < BLACK_MAX_CHANNEL) continue; // linework, not colour
    if (max - min < SATURATION_MIN_SPREAD) continue; // grey, not a hue

    surviving++;

    const { h, s } = hueSaturation(r, g, b);
    const bucketKey = Math.floor(h / HUE_BUCKET_SIZE) % HUE_BUCKET_COUNT;
    const bucket = buckets.get(bucketKey) ?? { weight: 0, r: 0, g: 0, b: 0 };
    bucket.weight += s;
    bucket.r += r * s;
    bucket.g += g * s;
    bucket.b += b * s;
    buckets.set(bucketKey, bucket);
  }

  if (pixelCount === 0 || surviving / pixelCount < MIN_SURVIVING_RATIO) return undefined;

  let best: Bucket | undefined;
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) best = bucket;
  }
  if (!best || best.weight === 0) return undefined;

  return rgbToHex({ r: best.r / best.weight, g: best.g / best.weight, b: best.b / best.weight });
}

/**
 * Fetches `url`, decodes it, and extracts its dominant colour — or
 * `undefined` on literally anything going wrong: a 404, an unsupported
 * format, a corrupt file, a logo with no real colour in it. None of those
 * are exceptional here; they're the common case for a data set this size,
 * and the caller's fallback (the hash palette) covers all of them alike.
 */
export async function deriveLogoColor(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;

    const bytes = new Uint8Array(await response.arrayBuffer());
    const { data, info } = await sharp(bytes)
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return dominantColorFromRgba(data, info.width * info.height);
  } catch {
    return undefined;
  }
}
