import { defineTheme } from '../define-theme';

/**
 * Prima (CNN Prima News) — embed partner theme, re-authored from the previous
 * platform's `prima.css`. Light-only on purpose — see
 * `diky-ze-muzem.theme.ts` for why partner themes are single-mode.
 *
 * The brand pair ports unchanged: the dark blue takes white ink at 11.0:1,
 * the red at 5.4:1 — nothing to adjust.
 */
export const primaTheme = defineTheme({
  name: 'prima',
  label: 'Prima',

  color: {
    light: {
      agree: '#003c76',
      disagree: '#d3161e',
      neutral: '#4f5862',
    },
  },
});
