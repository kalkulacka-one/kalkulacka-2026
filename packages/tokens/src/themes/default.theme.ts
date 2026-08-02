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
    // `question` intentionally omitted — it follows `display`.
  },

  color: {
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
