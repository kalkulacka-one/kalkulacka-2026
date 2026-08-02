/**
 * The icon set.
 *
 * Two families live here, and they are not interchangeable:
 *
 *  - The *marks* (`check`, `cross`, `star`) are the heavy prototype shapes the
 *    answer buttons are built from. Their paths are verbatim from the visual
 *    spec so the marks stay pixel-identical to it.
 *  - The *thin set* is everything spread from `THIN` below. It carries the
 *    logo's geometry — flat-cut ends, mitred corners, 45° diagonals — down to
 *    a hairline, so an icon reads as the same family as the wordmark without
 *    competing with the answer buttons for weight.
 *
 * Drawing a new thin icon: spread `THIN`, work on the 24 grid with the artwork
 * inside the middle 20 (terminals on 2/4/6…22), keep every angle a multiple of
 * 45° unless the shape is genuinely round, and use `dots` for anything solid —
 * those are the family's only filled elements, and they echo the two dots in
 * the wordmark.
 */
export type IconDefinition = {
  viewBox: string;
  /** `fill` uses currentColor as the fill; `stroke` outlines it. */
  mode: 'fill' | 'stroke';
  /** Outline geometry; more than one entry where a mark needs disjoint strokes. */
  paths: readonly string[];
  /** Solid circles, `[cx, cy, r]` — always filled, never stroked. */
  dots?: readonly (readonly [number, number, number])[];
  strokeWidth?: number;
  strokeLinejoin?: 'round' | 'miter';
  strokeLinecap?: 'round' | 'butt';
};

/** Shared geometry for the thin set. See the module comment before changing it. */
const THIN = {
  viewBox: '0 0 24 24',
  mode: 'stroke',
  strokeWidth: 1.5,
  strokeLinecap: 'butt',
  strokeLinejoin: 'miter',
} as const satisfies Omit<IconDefinition, 'paths'>;

export const icons = {
  /** "Souhlasím" — the checkmark. */
  check: {
    viewBox: '0 0 23 18',
    mode: 'fill',
    paths: [
      'M18.8702 0L22.2876 3.36487L10.8466 14.6297L7.42918 17.9946L0 10.6797L3.41742 7.31483L7.4292 11.2649L18.8702 0Z',
    ],
  },
  /** "Nesouhlasím" — the cross. */
  cross: {
    viewBox: '0 0 19 18',
    mode: 'fill',
    paths: [
      'M14.8585 3.3987e-05L18.2758 3.36491L12.5553 8.99735L18.2758 14.6298L14.8584 17.9946L9.13789 12.3622L3.4174 17.9946L0 14.6297L5.72047 8.99733L0 3.36485L3.41742 0L9.13792 5.6325L14.8585 3.3987e-05Z',
    ],
  },
  /** "Pro mě důležité" — outlined until active, then filled. */
  star: {
    viewBox: '0 0 24 23',
    mode: 'stroke',
    paths: [
      'M12 1.8 L15.1 8.1 L22 9.1 L17 14 L18.2 20.9 L12 17.6 L5.8 20.9 L7 14 L2 9.1 L8.9 8.1 Z',
    ],
    strokeWidth: 2,
    strokeLinejoin: 'round',
  },
  chevronLeft: {
    viewBox: '0 0 9 15',
    mode: 'stroke',
    paths: ['M7.5 1.5 L1.5 7.5 L7.5 13.5'],
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  chevronRight: {
    viewBox: '0 0 9 15',
    mode: 'stroke',
    paths: ['M1.5 1.5 L7.5 7.5 L1.5 13.5'],
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  close: {
    viewBox: '0 0 22 22',
    mode: 'stroke',
    paths: ['M3 3 L19 19 M19 3 L3 19'],
    strokeWidth: 2,
    strokeLinecap: 'round',
  },

  /* The thin set — 24 grid, 1.5 stroke, flat ends, mitred corners. */

  /** Arrow keys, with 45° heads so they rhyme with the logo's diagonals. */
  arrowLeft: { ...THIN, paths: ['M20 12 L4 12 M10 6 L4 12 L10 18'] },
  arrowRight: { ...THIN, paths: ['M4 12 L20 12 M14 6 L20 12 L14 18'] },
  arrowUp: { ...THIN, paths: ['M12 20 L12 4 M6 10 L12 4 L18 10'] },
  arrowDown: { ...THIN, paths: ['M12 4 L12 20 M6 14 L12 20 L18 14'] },
  /** Hairline counterparts of the answer marks, for inline use at 14–16px. */
  checkThin: { ...THIN, paths: ['M3.5 12 L9 17.5 L20.5 6'] },
  crossThin: { ...THIN, paths: ['M5 5 L19 19 M19 5 L5 19'] },
  starThin: {
    ...THIN,
    paths: [
      'M12 2.5 L14.53 8.52 L21.03 9.06 L16.09 13.33 L17.58 19.69 L12 16.3 L6.42 19.69 L7.91 13.33 L2.97 9.06 L9.47 8.52 Z',
    ],
  },
  /**
   * Punctuation drawn as marks rather than set as type. A `,` or `.` at key-cap
   * size is a couple of pixels of glyph adrift in a 24px box; built from the
   * family's own dot and a 45° tail they carry the same weight as the arrows
   * beside them. The two share a dot radius and centre so they read as a pair.
   */
  comma: { ...THIN, paths: ['M12.4 12.8 L8.6 16.6'], dots: [[12, 11, 2.6]] },
  period: { ...THIN, paths: [], dots: [[12, 13, 2.6]] },
  chevronLeftThin: { ...THIN, paths: ['M15 4 L7 12 L15 20'] },
  chevronRightThin: { ...THIN, paths: ['M9 4 L17 12 L9 20'] },
  chevronDownThin: { ...THIN, paths: ['M4 9 L12 17 L20 9'] },
  chevronUpThin: { ...THIN, paths: ['M4 15 L12 7 L20 15'] },
  /**
   * The lens is one of the few shapes the family allows to be genuinely round;
   * its handle stays on the 45° diagonal so it still rhymes with the wordmark.
   */
  search: {
    ...THIN,
    paths: ['M17 10.5 A6.5 6.5 0 1 1 4 10.5 A6.5 6.5 0 1 1 17 10.5', 'M15.1 15.1 L20 20'],
  },
  info: {
    ...THIN,
    paths: ['M21 12 A9 9 0 1 1 3 12 A9 9 0 1 1 21 12', 'M12 11.5 L12 17'],
    dots: [[12, 7.6, 1.15]],
  },
  share: {
    ...THIN,
    paths: ['M12 3.5 L12 15 M6.5 9 L12 3.5 L17.5 9 M4.5 14 L4.5 20.5 L19.5 20.5 L19.5 14'],
  },
  /** Results — three bars, the progress row's shape at icon scale. */
  results: { ...THIN, paths: ['M4 20 L4 13 M12 20 L12 5 M20 20 L20 9'] },
  list: { ...THIN, paths: ['M4 6 L20 6 M4 12 L20 12 M4 18 L20 18'] },
  plus: { ...THIN, paths: ['M12 4 L12 20 M4 12 L20 12'] },
  /**
   * Start over. The ring is one of the shapes the family allows to be round;
   * the gap and the arrowhead sit on the diagonal so it still reads as drawn
   * with the same pen as the wordmark.
   */
  restart: { ...THIN, paths: ['M12 19 A7 7 0 1 1 19 12', 'M16 9 L19 12 L22 9'] },
  /** Leave — an arrow stepping out through the open side of a frame. */
  exit: {
    ...THIN,
    paths: ['M13 4 L4 4 L4 20 L13 20', 'M10 12 L20 12 M15.5 7.5 L20 12 L15.5 16.5'],
  },
  more: {
    ...THIN,
    paths: [],
    dots: [
      [5, 12, 1.6],
      [12, 12, 1.6],
      [19, 12, 1.6],
    ],
  },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof icons;
