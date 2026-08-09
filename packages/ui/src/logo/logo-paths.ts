/**
 * The wordmark's geometry, as path data.
 *
 * Extracted from the component so the share image can draw the same mark onto a
 * canvas with `Path2D`. Two copies of a logo is exactly the kind of thing that
 * silently diverges, so there is one — the SVG below and the exported PNG are
 * literally the same shapes.
 *
 * Reachable as `@vk/ui/logo-paths` as well as through the package barrel: the
 * OG image route draws this mark from a Next route handler, where importing
 * the barrel would pull every client component and its CSS modules along.
 */
export const LOGO_VIEWBOX = { x: 0, y: 0, width: 58, height: 12 } as const;

/** The percent sign on its own, still in the full wordmark's coordinate space. */
export const PERCENT_PATHS = [
  'M54.9353 2.59794e-06L45.0297 9.75313L47.3079 11.9964L57.2136 2.24325L54.9353 2.59794e-06Z',
  'M48.6885 2.24325C48.6885 3.23356 47.8732 4.03636 46.8674 4.03636C45.8616 4.03636 45.0463 3.23356 45.0463 2.24325C45.0463 1.25295 45.8616 0.450149 46.8674 0.450149C47.8732 0.450149 48.6885 1.25295 48.6885 2.24325Z',
  'M56.9168 9.7532C56.9168 10.7435 56.1014 11.5463 55.0957 11.5463C54.0899 11.5463 53.2745 10.7435 53.2745 9.7532C53.2745 8.7629 54.0899 7.9601 55.0957 7.9601C56.1014 7.9601 56.9168 8.7629 56.9168 9.7532Z',
] as const;

export const LOGO_PATHS = [
  'M24.1777 0L14.272 9.75313L16.5503 11.9964L26.4559 2.24325L24.1777 0Z',
  'M12.5802 2.59794e-06L14.8584 2.24325L7.23107 9.75315L4.95279 11.9964L0 7.11979L2.27828 4.87655L4.9528 7.50993L12.5802 2.59794e-06Z',
  'M39.5072 2.52559e-05L41.7855 2.24327L37.9718 5.99824L41.7855 9.7532L39.5072 11.9964L35.6935 8.24146L31.8799 11.9964L29.6016 9.75316L33.4153 5.99822L29.6016 2.24324L31.8799 2.59794e-06L35.6936 3.755L39.5072 2.52559e-05Z',
  ...PERCENT_PATHS,
] as const;

/** The percent mark's own tight viewBox, for rendering it alone. */
export const PERCENT_VIEWBOX = { x: 45, y: 0, width: 12.2, height: 12 } as const;
