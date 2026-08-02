import { defineTheme } from '../define-theme';

/**
 * Proof that re-skinning is cheap.
 *
 * Deliberately as far from the default as possible — dark, different hues, a
 * different question face, square-ish cards — and still only this many lines.
 * Everything unstated (all the hover/active/soft variants, the whole fluid
 * scale, shadows, spacing) is inherited or derived.
 *
 * This theme exists to be switched to in Storybook: if anything fails to
 * re-skin, a hardcoded value leaked into a component.
 */
export const midnightTheme = defineTheme({
  name: 'midnight',
  label: 'Midnight (demo)',

  typeface: {
    // A different face for statements only — the single most requested override.
    question: 'Georgia, ui-serif, serif',
  },

  color: {
    agree: '#22d3ee',
    disagree: '#fb7185',
    neutral: '#e2e8f0',

    page: '#0b1120',
    surface: '#151f34',
    surfaceSunken: '#1e293b',

    text: '#e8eefc',
    textMuted: '#94a3b8',
    border: '#334155',

    focus: '#22d3ee',
  },

  radius: {
    card: '4px 20px 20px 20px',
    chip: '6px',
  },

  backdrop: 'none',
});
