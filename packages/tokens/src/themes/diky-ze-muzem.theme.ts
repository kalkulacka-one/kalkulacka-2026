import { defineTheme } from '../define-theme';

/**
 * Díky, že můžem — embed partner theme, re-authored from the previous
 * platform's `diky-ze-muzem.css` (deep indigo primary, crimson secondary).
 *
 * Light-only on purpose, like every partner theme was on the old platform: an
 * embed sits inside the partner's article, which does not follow the reader's
 * OS scheme, so the embed keeping one face is the consistent behaviour (see
 * contract.ts on single-mode themes).
 *
 * The crimson is `#e60345`, one step darker than the brand's `#f00346`: the
 * original sits at OKLCH L 0.606 — below the ink threshold, so it takes white
 * ink — but only reaches 4.37:1 against it. This value keeps the hue and
 * clears 4.5:1 (4.70:1).
 *
 * The old theme also set Inter for everything; typefaces are left alone here
 * until per-partner font loading exists (Phase F1) — a `typeface` override
 * without the font files shipped would render a system fallback, not Inter.
 */
export const dikyZeMuzemTheme = defineTheme({
  name: 'diky-ze-muzem',
  label: 'Díky, že můžem',

  color: {
    light: {
      agree: '#28265c',
      disagree: '#e60345',
      neutral: '#334155',
    },
  },
});
