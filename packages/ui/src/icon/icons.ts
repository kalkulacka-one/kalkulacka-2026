/**
 * The icon set, with paths taken verbatim from the prototype so the marks are
 * pixel-identical to the visual spec.
 *
 * Icons are either filled or stroked; storing that alongside the path means a
 * caller never has to know which is which.
 */
export type IconDefinition = {
  viewBox: string;
  /** `fill` uses currentColor as the fill; `stroke` outlines it. */
  mode: 'fill' | 'stroke';
  path: string;
  strokeWidth?: number;
  strokeLinejoin?: 'round' | 'miter';
  strokeLinecap?: 'round' | 'butt';
};

export const icons = {
  /** "Souhlasím" — the checkmark. */
  check: {
    viewBox: '0 0 23 18',
    mode: 'fill',
    path: 'M18.8702 0L22.2876 3.36487L10.8466 14.6297L7.42918 17.9946L0 10.6797L3.41742 7.31483L7.4292 11.2649L18.8702 0Z',
  },
  /** "Nesouhlasím" — the cross. */
  cross: {
    viewBox: '0 0 19 18',
    mode: 'fill',
    path: 'M14.8585 3.3987e-05L18.2758 3.36491L12.5553 8.99735L18.2758 14.6298L14.8584 17.9946L9.13789 12.3622L3.4174 17.9946L0 14.6297L5.72047 8.99733L0 3.36485L3.41742 0L9.13792 5.6325L14.8585 3.3987e-05Z',
  },
  /** "Pro mě důležité" — outlined until active, then filled. */
  star: {
    viewBox: '0 0 24 23',
    mode: 'stroke',
    path: 'M12 1.8 L15.1 8.1 L22 9.1 L17 14 L18.2 20.9 L12 17.6 L5.8 20.9 L7 14 L2 9.1 L8.9 8.1 Z',
    strokeWidth: 2,
    strokeLinejoin: 'round',
  },
  chevronLeft: {
    viewBox: '0 0 9 15',
    mode: 'stroke',
    path: 'M7.5 1.5 L1.5 7.5 L7.5 13.5',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  chevronRight: {
    viewBox: '0 0 9 15',
    mode: 'stroke',
    path: 'M1.5 1.5 L7.5 7.5 L1.5 13.5',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  close: {
    viewBox: '0 0 22 22',
    mode: 'stroke',
    path: 'M3 3 L19 19 M19 3 L3 19',
    strokeWidth: 2,
    strokeLinecap: 'round',
  },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof icons;
