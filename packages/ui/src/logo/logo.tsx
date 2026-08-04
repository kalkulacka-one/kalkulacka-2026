/**
 * The wordmark glyph, lifted from the prototype (`viewBox 0 0 58 12`).
 *
 * Fixed brand geometry, not a theme token — a partner re-skinning the app
 * replaces this component (or the logo file, per the forking guide) rather
 * than reconfiguring it, the same way any other brand wordmark would be
 * swapped. Colour comes from `currentColor`, so it follows the surrounding
 * text colour automatically.
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
      width={Math.round((size * 12.2) / 12)}
      height={size}
      viewBox="45 0 12.2 12"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M54.9353 2.59794e-06L45.0297 9.75313L47.3079 11.9964L57.2136 2.24325L54.9353 2.59794e-06Z"
        fill="currentColor"
      />
      <path
        d="M48.6885 2.24325C48.6885 3.23356 47.8732 4.03636 46.8674 4.03636C45.8616 4.03636 45.0463 3.23356 45.0463 2.24325C45.0463 1.25295 45.8616 0.450149 46.8674 0.450149C47.8732 0.450149 48.6885 1.25295 48.6885 2.24325Z"
        fill="currentColor"
      />
      <path
        d="M56.9168 9.7532C56.9168 10.7435 56.1014 11.5463 55.0957 11.5463C54.0899 11.5463 53.2745 10.7435 53.2745 9.7532C53.2745 8.7629 54.0899 7.9601 55.0957 7.9601C56.1014 7.9601 56.9168 8.7629 56.9168 9.7532Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Logo({ size = 12, className }: LogoProps) {
  return (
    <svg
      className={className}
      width={Math.round((size * 58) / 12)}
      height={size}
      viewBox="0 0 58 12"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M24.1777 0L14.272 9.75313L16.5503 11.9964L26.4559 2.24325L24.1777 0Z"
        fill="currentColor"
      />
      <path
        d="M54.9353 2.59794e-06L45.0297 9.75313L47.3079 11.9964L57.2136 2.24325L54.9353 2.59794e-06Z"
        fill="currentColor"
      />
      <path
        d="M12.5802 2.59794e-06L14.8584 2.24325L7.23107 9.75315L4.95279 11.9964L0 7.11979L2.27828 4.87655L4.9528 7.50993L12.5802 2.59794e-06Z"
        fill="currentColor"
      />
      <path
        d="M39.5072 2.52559e-05L41.7855 2.24327L37.9718 5.99824L41.7855 9.7532L39.5072 11.9964L35.6935 8.24146L31.8799 11.9964L29.6016 9.75316L33.4153 5.99822L29.6016 2.24324L31.8799 2.59794e-06L35.6936 3.755L39.5072 2.52559e-05Z"
        fill="currentColor"
      />
      <path
        d="M48.6885 2.24325C48.6885 3.23356 47.8732 4.03636 46.8674 4.03636C45.8616 4.03636 45.0463 3.23356 45.0463 2.24325C45.0463 1.25295 45.8616 0.450149 46.8674 0.450149C47.8732 0.450149 48.6885 1.25295 48.6885 2.24325Z"
        fill="currentColor"
      />
      <path
        d="M56.9168 9.7532C56.9168 10.7435 56.1014 11.5463 55.0957 11.5463C54.0899 11.5463 53.2745 10.7435 53.2745 9.7532C53.2745 8.7629 54.0899 7.9601 55.0957 7.9601C56.1014 7.9601 56.9168 8.7629 56.9168 9.7532Z"
        fill="currentColor"
      />
    </svg>
  );
}
