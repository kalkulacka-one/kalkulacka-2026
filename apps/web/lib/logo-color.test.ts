import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deriveLogoColor, dominantColorFromRgba } from './logo-color';

type PixelGroup = { r: number; g: number; b: number; a?: number; count: number };

/** A raw RGBA buffer built from named groups of identical pixels, in group order. */
function buildRgba(groups: PixelGroup[]): { data: Buffer; pixelCount: number } {
  const pixelCount = groups.reduce((sum, g) => sum + g.count, 0);
  const data = Buffer.alloc(pixelCount * 4);
  let i = 0;
  for (const group of groups) {
    for (let n = 0; n < group.count; n++) {
      data[i++] = group.r;
      data[i++] = group.g;
      data[i++] = group.b;
      data[i++] = group.a ?? 255;
    }
  }
  return { data, pixelCount };
}

describe('dominantColorFromRgba', () => {
  it('gives up on an all-white logo — the background field, not a mark', () => {
    const { data, pixelCount } = buildRgba([{ r: 255, g: 255, b: 255, count: 64 }]);
    expect(dominantColorFromRgba(data, pixelCount)).toBeUndefined();
  });

  it('gives up on a fully transparent logo', () => {
    const { data, pixelCount } = buildRgba([{ r: 220, g: 38, b: 38, a: 0, count: 64 }]);
    expect(dominantColorFromRgba(data, pixelCount)).toBeUndefined();
  });

  it('gives up on a grayscale mark — no hue to bucket', () => {
    const { data, pixelCount } = buildRgba([
      { r: 20, g: 20, b: 20, count: 20 },
      { r: 120, g: 120, b: 120, count: 20 },
      { r: 230, g: 230, b: 230, count: 24 },
    ]);
    expect(dominantColorFromRgba(data, pixelCount)).toBeUndefined();
  });

  it('gives up when surviving colour is under 5% of the image', () => {
    // 3 vivid pixels in a 100-pixel field — real colour, but too little of it.
    const { data, pixelCount } = buildRgba([
      { r: 255, g: 255, b: 255, count: 97 },
      { r: 37, g: 99, b: 235, count: 3 },
    ]);
    expect(dominantColorFromRgba(data, pixelCount)).toBeUndefined();
  });

  it('picks out the single real hue in an otherwise white logo', () => {
    const { data, pixelCount } = buildRgba([
      { r: 255, g: 255, b: 255, count: 50 },
      { r: 37, g: 99, b: 235, count: 50 }, // a vivid blue mark
    ]);
    expect(dominantColorFromRgba(data, pixelCount)).toBe('#2563eb');
  });

  it('picks the dominant hue when a logo mixes two real colours', () => {
    const { data, pixelCount } = buildRgba([
      { r: 255, g: 255, b: 255, count: 20 },
      { r: 220, g: 38, b: 38, count: 60 }, // majority red
      { r: 34, g: 197, b: 94, count: 20 }, // minority green
    ]);
    expect(dominantColorFromRgba(data, pixelCount)).toBe('#dc2626');
  });
});

describe('deriveLogoColor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches, decodes, and derives a colour from a real (tiny, generated) PNG', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 37, g: 99, b: 235, alpha: 1 } },
    })
      .png()
      .toBuffer();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array(png), { status: 200 })),
    );

    await expect(deriveLogoColor('https://example.com/logo.png')).resolves.toBe('#2563eb');
  });

  it('gives up on a logo with no real colour, even a real one', async () => {
    const png = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array(png), { status: 200 })),
    );

    await expect(deriveLogoColor('https://example.com/white.png')).resolves.toBeUndefined();
  });

  it('returns undefined rather than throwing on a failed fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    await expect(deriveLogoColor('https://example.com/missing.png')).resolves.toBeUndefined();
  });

  it('returns undefined rather than throwing on bytes sharp can’t decode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 })),
    );

    await expect(deriveLogoColor('https://example.com/not-an-image')).resolves.toBeUndefined();
  });
});
