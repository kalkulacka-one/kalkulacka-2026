import { parseColor, type Rgb, type ThemeColors } from './palette';

/** The tokens a palette is built from, and what to fall back to if one is missing. */
const TOKENS = {
  page: ['--vk-color-page', '#f8fafc'],
  surface: ['--vk-color-surface', '#ffffff'],
  text: ['--vk-color-text', '#1e293b'],
  textMuted: ['--vk-color-text-muted', '#64748b'],
  border: ['--vk-color-border', '#e2e8f0'],
  agree: ['--vk-color-agree', '#2563eb'],
  disagree: ['--vk-color-disagree', '#dc2626'],
} as const satisfies Record<keyof ThemeColors, readonly [string, string]>;

/**
 * The active theme's colours, resolved for one light/dark mode.
 *
 * Neither half of this is the obvious code, and both have a reason:
 *
 *  - **Why a probe element rather than `getPropertyValue`.** A custom property
 *    read straight back is its *authored* text, which for a derived token is
 *    something like `oklch(from var(--vk-color-agree) …)` — not a colour.
 *    Assigning it to a real property and reading *that* back makes the browser
 *    resolve it, and `color` always comes back as `rgb(...)`.
 *
 *  - **Why the root's mode is flipped rather than the probe's.** The dialog
 *    offers a light *and* a dark card whichever mode the reader is in, so both
 *    palettes must be legible at once. The tokens are `light-dark()`, which
 *    resolves where the custom property is *declared* (`:root`) — so a
 *    `color-scheme` on the probe changes nothing. Worse, the app's CSS is
 *    compiled by Lightning CSS, which polyfills `light-dark()` into a pair of
 *    root-level custom properties keyed off `[data-mode]` and the media query,
 *    where `color-scheme` is not consulted at all. Writing `data-mode` is
 *    therefore the lever that works in the built app, and `color-scheme` the
 *    one that works where the CSS is served untranspiled (Storybook); both are
 *    set, and both are restored before this returns. Nothing paints in between
 *    — style recalculation is synchronous, rendering is not.
 *
 * The tokens are read from the DOM rather than imported from `@vk/tokens` so a
 * partner brand applied at runtime is picked up without this knowing any theme
 * names.
 */
export function readThemeColors(mode: 'light' | 'dark'): ThemeColors {
  const fallback = () =>
    Object.fromEntries(
      Object.entries(TOKENS).map(([key, [, hex]]) => [key, parseColor(hex) as Rgb]),
    ) as ThemeColors;

  if (typeof document === 'undefined') return fallback();

  const root = document.documentElement;
  const previousScheme = root.style.colorScheme;
  const previousMode = root.dataset.mode;
  root.style.colorScheme = mode;
  root.dataset.mode = mode;

  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.top = '0';
  probe.style.left = '0';
  probe.style.width = '0';
  probe.style.height = '0';
  probe.style.pointerEvents = 'none';
  probe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(probe);

  try {
    const read = (token: string, hex: string): Rgb => {
      probe.style.color = '';
      probe.style.color = `var(${token}, ${hex})`;
      return parseColor(getComputedStyle(probe).color) ?? (parseColor(hex) as Rgb);
    };

    return Object.fromEntries(
      Object.entries(TOKENS).map(([key, [token, hex]]) => [key, read(token, hex)]),
    ) as ThemeColors;
  } finally {
    probe.remove();
    root.style.colorScheme = previousScheme;
    // Absent, not empty: the app leaves `data-mode` off entirely until someone
    // picks a mode, and that absence is what lets the OS preference stand.
    if (previousMode === undefined) delete root.dataset.mode;
    else root.dataset.mode = previousMode;
  }
}

/**
 * The theme's own typeface stacks, resolved the same way — canvas needs a real
 * font shorthand string, and `--vk-typeface-sans` is itself a `var()` chain.
 */
export function readThemeFonts(): { display: string; sans: string } {
  const fallbackStack = 'system-ui, sans-serif';
  if (typeof document === 'undefined') return { display: fallbackStack, sans: fallbackStack };

  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.pointerEvents = 'none';
  probe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(probe);

  try {
    const read = (token: string) => {
      probe.style.fontFamily = `var(${token}, ${fallbackStack})`;
      return getComputedStyle(probe).fontFamily || fallbackStack;
    };

    return { display: read('--vk-typeface-display'), sans: read('--vk-typeface-sans') };
  } finally {
    probe.remove();
  }
}
