import { LOGO_PATHS, LOGO_VIEWBOX, PERCENT_PATHS, PERCENT_VIEWBOX } from './logo-paths';

/**
 * The wordmark glyph, lifted from the prototype (`viewBox 0 0 58 12`).
 *
 * Fixed brand geometry, not a theme token — a partner re-skinning the app
 * replaces this component (or the logo file, per the forking guide) rather
 * than reconfiguring it, the same way any other brand wordmark would be
 * swapped. Colour comes from `currentColor`, so it follows the surrounding
 * text colour automatically.
 *
 * The path data lives in `logo-paths.ts` because the share image draws the
 * same mark onto a canvas.
 */
export type LogoProps = {
  /** Height in px. Width follows the glyph's 58:12 aspect ratio. */
  size?: number;
  className?: string;
};

/**
 * The percent sign out of the wordmark, on its own.
 *
 * The mark reads `✓ / ✗ %` — a check, a cut, a cross, and this: two dots with a
 * slash between them, in the same flat-cut geometry as the rest. Lifted verbatim
 * from the paths above (translated to its own origin) rather than redrawn, so
 * the calculating screen resolves onto a shape that is literally the logo's and
 * cannot drift from it.
 */
export function PercentMark({ size = 24, className }: LogoProps) {
  return (
    <svg
      className={className}
      width={Math.round((size * PERCENT_VIEWBOX.width) / PERCENT_VIEWBOX.height)}
      height={size}
      viewBox={`${PERCENT_VIEWBOX.x} ${PERCENT_VIEWBOX.y} ${PERCENT_VIEWBOX.width} ${PERCENT_VIEWBOX.height}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {PERCENT_PATHS.map((d) => (
        <path key={d} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

export function Logo({ size = 12, className }: LogoProps) {
  return (
    <svg
      className={className}
      width={Math.round((size * LOGO_VIEWBOX.width) / LOGO_VIEWBOX.height)}
      height={size}
      viewBox={`${LOGO_VIEWBOX.x} ${LOGO_VIEWBOX.y} ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}
