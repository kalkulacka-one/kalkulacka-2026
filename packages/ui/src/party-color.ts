/**
 * A stable accent colour per candidate, so the same party reads as the same
 * colour everywhere it appears in a ranking — the match bar and the avatar's
 * ring share this rather than each guessing independently.
 *
 * Not read from the logo itself: most are transparent or white-on-white PNGs,
 * fetched from the archive rather than this origin, so pulling a dominant
 * colour out of them would mean a canvas read that's async, occasionally
 * CORS-blocked, and still wrong for a monochrome mark. A name-seeded pick
 * from a fixed palette is instant, always available, and — because it's a
 * hash rather than an index — stays put across a session even as the list
 * re-sorts.
 */
const PALETTE = [
  'light-dark(#2563eb, #3b82f6)', // blue
  'light-dark(#7c3aed, #a78bfa)', // violet
  'light-dark(#0d9488, #2dd4bf)', // teal
  'light-dark(#d97706, #fbbf24)', // amber
  'light-dark(#db2777, #f472b6)', // pink
  'light-dark(#059669, #34d399)', // emerald
  'light-dark(#4f46e5, #818cf8)', // indigo
  'light-dark(#ea580c, #fb923c)', // orange
  'light-dark(#0891b2, #22d3ee)', // cyan
  'light-dark(#65a30d, #a3e635)', // lime
];

const FALLBACK = PALETTE[0] as string;

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i++) {
    result = (result * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(result);
}

/** A `light-dark()` colour, picked deterministically from `seed` (typically a candidate's name). */
export function partyColor(seed: string): string {
  return PALETTE[hash(seed) % PALETTE.length] ?? FALLBACK;
}
