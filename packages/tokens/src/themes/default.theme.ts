import { defineTheme } from '../define-theme';

/**
 * The reference theme. Values are lifted directly from the prototype
 * (`Volebni kalkulacka - WebII.dc.html`), which is the visual spec.
 *
 * This is the only theme that sets every field — it is the fallback everything
 * else layers on top of. A partner theme overrides a few lines and inherits the
 * rest.
 */
export const defaultTheme = defineTheme({
  name: 'default',
  label: 'Volební kalkulačka',

  typeface: {
    display: "var(--vk-font-display, 'Radio Canada'), system-ui, sans-serif",
    sans: "var(--vk-font-sans, 'Geist'), system-ui, sans-serif",
    mono: "var(--vk-font-mono, 'Geist Mono'), ui-monospace, monospace",
    /*
     * The prototype's own default is Geist, not Radio Canada — its
     * `questionRadioCanada` toggle defaults to `false`. Set explicitly (rather
     * than left to fall back to `display`) so it's obvious this is a real
     * choice, not an oversight: swap this one line for `display`, or any
     * other face, whenever the question statement should look different from
     * the body copy again.
     */
    question: "var(--vk-font-sans, 'Geist'), system-ui, sans-serif",
  },

  color: {
    light: {
      agree: '#2563eb',
      disagree: '#dc2626',
      neutral: '#334155',

      page: '#f8fafc',
      surface: '#ffffff',
      surfaceSunken: '#f1f5f9',

      text: '#1e293b',
      textMuted: '#64748b',
      border: '#e2e8f0',

      focus: '#2563eb',
    },
    /*
     * A real palette, not the light one inverted: a flat, solid dark page
     * (no attempt to fake elevation with a busy gradient) with the card and
     * chip stepping up from it in two deliberate stages, and the brand
     * colours brightened a notch — the light palette's exact blue/red read
     * slightly muddy against near-black rather than white.
     *
     * That brightening is capped by contrast, not just taste: the filled
     * answer button pins its ink to white in dark mode (`--vk-color-agree-on`
     * / `-disagree-on` in `base.css`), so `agree`/`disagree` here can only go
     * as light as still clears 4.5:1 against white. `#3b82f6`/`#f87171` (the
     * original brightened pair) landed at 3.68:1 / 2.77:1 — these are the
     * same hue pulled back down until white ink reads again.
     */
    dark: {
      agree: '#2c6cee',
      disagree: '#df2e2e',
      neutral: '#cbd5e1',

      page: '#0b1220',
      surface: '#1b2740',
      surfaceSunken: '#151f30',

      text: '#e8eef7',
      textMuted: '#94a3b8',
      border: '#2b3648',

      focus: '#3b82f6',
    },
  },

  radius: {
    // The design's signature: square top-left, rounded elsewhere.
    card: '0 30px 30px 30px',
    chip: '9px',
    pill: '100px',
    // `control` intentionally omitted — it ramps with the fluid scale (16→22px).
  },

  motion: {
    durationFast: '120ms',
    durationBase: '150ms',
    durationSlow: '250ms',
    easingSpring: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
    easingExit: 'cubic-bezier(0.3, 0.6, 0.4, 1)',
  },

  backdrop: 'gradient',
});
