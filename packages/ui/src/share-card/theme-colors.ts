import type { CSSProperties } from 'react';
import type { ShaderColors } from '../backdrop/shader-renderer';

/** An sRGB colour, 0–255 per channel. Canvas, the shader, and CSS all start here. */
export type Rgb = [number, number, number];

/** The themes a share card can be painted in. */
export const CARD_THEMES = ['light', 'dark', 'agree', 'disagree'] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

/**
 * The raw seed colours `base.css` derives everything else from — same shape as
 * `@vk/tokens`' `ColorSet`, but resolved to concrete RGB rather than optional
 * CSS strings, and with `neutral` renamed to match the custom property it
 * actually lands under (see `to-css.ts`).
 */
export type CardColorSet = {
  page: Rgb;
  surface: Rgb;
  surfaceSunken: Rgb;
  text: Rgb;
  textMuted: Rgb;
  border: Rgb;
  agree: Rgb;
  disagree: Rgb;
  neutralRaw: Rgb;
  focus: Rgb;
};

const clamp255 = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

/** Linear sRGB blend. `amount` is how far to travel from `from` toward `to`. */
export function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  const t = Math.max(0, Math.min(1, amount));
  return [
    clamp255(from[0] + (to[0] - from[0]) * t),
    clamp255(from[1] + (to[1] - from[1]) * t),
    clamp255(from[2] + (to[2] - from[2]) * t),
  ];
}

/** Parse `#rgb`, `#rrggbb`, `rgb(...)` or `rgba(...)`. `null` when it is none of those. */
export function parseColor(value: string): Rgb | null {
  const text = value.trim();

  const short = text.match(/^#([0-9a-f]{3})$/i);
  if (short?.[1]) {
    const [r, g, b] = short[1];
    return [
      Number.parseInt(`${r}${r}`, 16),
      Number.parseInt(`${g}${g}`, 16),
      Number.parseInt(`${b}${b}`, 16),
    ];
  }

  const hex = text.match(/^#([0-9a-f]{6})$/i);
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const rgb = text.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb?.[1] && rgb[2] && rgb[3]) {
    return [clamp255(Number(rgb[1])), clamp255(Number(rgb[2])), clamp255(Number(rgb[3]))];
  }

  return null;
}

/** `rgb(r g b)`, optionally with alpha — what an inline style or a canvas fill wants. */
export function css(color: Rgb, alpha = 1): string {
  return alpha >= 1
    ? `rgb(${color[0]} ${color[1]} ${color[2]})`
    : `rgb(${color[0]} ${color[1]} ${color[2]} / ${alpha})`;
}

const WHITE: Rgb = [255, 255, 255];
/** Not black: a hair of blue keeps a red-seeded card from going muddy brown. */
const INK: Rgb = [8, 10, 20];

/**
 * A brand-coloured card's colour set, built from one seed.
 *
 * Rather than hand-picking a fifth and sixth palette, the agree and disagree
 * themes are *derived* from whichever colours the active theme already calls
 * agree and disagree — so a partner theme gets its own two colourways for
 * free, and they cannot drift from the answer buttons they are named after.
 *
 * Dark-forward on purpose: a saturated hue only stays legible under white text
 * once it has been taken most of the way to ink, and a story posted to a phone
 * is looked at in a dark feed more often than not.
 */
function seededColorSet(seed: Rgb, counterpart: Rgb): CardColorSet {
  const page = mix(seed, INK, 0.78);
  // A step *up* from the page toward the seed's own saturation, not toward
  // white — `MatchRow`'s row background is this colour with white text sat
  // directly on it, and white only clears AA (10:1+ here) while the surface
  // stays this dark. Mixing toward white instead (the first attempt) put the
  // surface close enough to the seed's own mid-tone to fail contrast outright.
  const surface = mix(page, seed, 0.4);
  const textMuted = mix(seed, WHITE, 0.72);
  return {
    page,
    surface,
    surfaceSunken: mix(page, seed, 0.15),
    text: WHITE,
    textMuted,
    border: mix(surface, WHITE, 0.3),
    agree: seed,
    disagree: mix(seed, counterpart, 0.6),
    neutralRaw: textMuted,
    focus: seed,
  };
}

/** Build the full colour set for one card theme out of the live theme's tokens. */
export function cardColorSet(
  theme: CardTheme,
  live: { light: CardColorSet; dark: CardColorSet },
): CardColorSet {
  if (theme === 'light') return live.light;
  if (theme === 'dark') return live.dark;
  // Both brand cards are seeded from the *dark* palette's agree/disagree: the
  // light palette's exact hues read slightly muddy once pulled this close to
  // ink, the same reason `dark.theme.ts` brightens them a notch of its own.
  if (theme === 'agree') return seededColorSet(live.dark.agree, live.dark.disagree);
  return seededColorSet(live.dark.disagree, live.dark.agree);
}

/** Every card theme but `light` sits on a near-black surface with white ink. */
export function cardColorScheme(theme: CardTheme): 'light' | 'dark' {
  return theme === 'light' ? 'light' : 'dark';
}

/** The wash's four shader colours, taken straight from the card's own palette. */
export function washColors(colors: CardColorSet): ShaderColors {
  const toShaderRgb = (c: Rgb): [number, number, number] => [c[0] / 255, c[1] / 255, c[2] / 255];
  return {
    base: toShaderRgb(colors.page),
    accentA: toShaderRgb(colors.agree),
    accentB: toShaderRgb(colors.disagree),
    light: toShaderRgb(colors.surface),
  };
}

/**
 * The inline style that makes a subtree render in this colour set regardless
 * of the document's own theme.
 *
 * Two separate mechanisms, because the design system's colours are resolved
 * two different ways:
 *
 *  - `data-vk-theme-scope` is what tells `base.css`'s derived rules
 *    (hover/active/soft/on colours, shadows, focus ring) to recompute for
 *    this element instead of only ever applying at `:root`.
 *  - `colorScheme` is a real CSS property, not a custom one, and it is what a
 *    genuine (unpolyfilled) `light-dark()` value resolves against — which is
 *    exactly what `MatchRow`'s own per-candidate accent is (`--row-accent`,
 *    set inline from `useLogoAccent`/`partyColor`, never touched by Lightning
 *    CSS since it never appears in an authored stylesheet). Without this, a
 *    dark card rendered while the app itself is in light mode would still
 *    pick every row's *light*-mode accent.
 *
 * Every component in `@vk/ui` already reads exclusively through `--vk-*`
 * custom properties (or a `light-dark()` value it sets itself), so nothing
 * downstream needs to know this scope exists.
 */
export function cardCssVars(colors: CardColorSet, mode: 'light' | 'dark'): CSSProperties {
  return {
    colorScheme: mode,
    ['--vk-color-page' as string]: css(colors.page),
    ['--vk-color-surface' as string]: css(colors.surface),
    ['--vk-color-surface-sunken' as string]: css(colors.surfaceSunken),
    ['--vk-color-text' as string]: css(colors.text),
    ['--vk-color-text-muted' as string]: css(colors.textMuted),
    ['--vk-color-border' as string]: css(colors.border),
    ['--vk-color-agree' as string]: css(colors.agree),
    ['--vk-color-disagree' as string]: css(colors.disagree),
    ['--vk-color-neutral-raw' as string]: css(colors.neutralRaw),
    ['--vk-color-focus' as string]: css(colors.focus),
  };
}

/**
 * The tokens read off the DOM, and what to fall back to if one is missing.
 *
 * These hexes are hand-copied from the default theme's light palette
 * (`packages/tokens/src/themes/default.theme.ts`) — this package deliberately
 * has no dependency on `@vk/tokens` internals, so nothing enforces the two
 * staying in sync. Only hit when there is no DOM to probe (server/tests), so
 * drift here is cosmetic rather than a rendering bug, but worth re-checking
 * by hand if the default theme's palette changes.
 */
const TOKENS = {
  page: ['--vk-color-page', '#f8fafc'],
  surface: ['--vk-color-surface', '#ffffff'],
  surfaceSunken: ['--vk-color-surface-sunken', '#f1f5f9'],
  text: ['--vk-color-text', '#1e293b'],
  textMuted: ['--vk-color-text-muted', '#64748b'],
  border: ['--vk-color-border', '#e2e8f0'],
  agree: ['--vk-color-agree', '#2563eb'],
  disagree: ['--vk-color-disagree', '#dc2626'],
  neutralRaw: ['--vk-color-neutral-raw', '#334155'],
  focus: ['--vk-color-focus', '#2563eb'],
} as const satisfies Record<keyof CardColorSet, readonly [string, string]>;

/**
 * The active theme's own raw seeds, resolved for one light/dark mode.
 *
 * Two things make this less direct than reading the tokens off `<html>`:
 *
 *  - **Why a probe element rather than `getPropertyValue`.** A custom property
 *    read straight back is its *authored* text, which for a `light-dark()`
 *    token is something like `light-dark(#f8fafc, #0b1220)` — not a colour.
 *    Assigning it to a real property and reading *that* back makes the browser
 *    resolve it, and `color` always comes back as `rgb(...)`.
 *
 *  - **Why the root's mode is flipped rather than the probe's.** `light-dark()`
 *    resolves where the custom property is *declared* (`:root`), not where the
 *    probe reads it — and the app's CSS is compiled by Lightning CSS, which
 *    polyfills `light-dark()` into root-level properties keyed off
 *    `[data-mode]`, where `color-scheme` on the probe is not consulted at all.
 *    Writing `data-mode` on the root is therefore the lever that actually
 *    works, and it is restored before this returns. Nothing paints in between
 *    — style recalculation is synchronous, rendering is not.
 *
 * Reads live off the DOM rather than importing a theme object, so a partner
 * brand applied at runtime is picked up without this knowing any theme names.
 */
export function readActiveColorSet(mode: 'light' | 'dark'): CardColorSet {
  const fallback = () =>
    Object.fromEntries(
      Object.entries(TOKENS).map(([key, [, hex]]) => [key, parseColor(hex) as Rgb]),
    ) as CardColorSet;

  if (typeof document === 'undefined') return fallback();

  const root = document.documentElement;
  const previousMode = root.dataset.mode;
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
    ) as CardColorSet;
  } finally {
    probe.remove();
    if (previousMode === undefined) delete root.dataset.mode;
    else root.dataset.mode = previousMode;
  }
}

/** Both modes at once — what every card theme is ultimately built from. */
export function readActiveColorSets(): { light: CardColorSet; dark: CardColorSet } {
  return { light: readActiveColorSet('light'), dark: readActiveColorSet('dark') };
}
