/** An sRGB colour, 0–255 per channel. Canvas and the shader both start here. */
export type Rgb = [number, number, number];

/** The themes a share image can be exported in. */
export const CARD_THEMES = ['light', 'dark', 'agree', 'disagree'] as const;
export type CardTheme = (typeof CARD_THEMES)[number];

/** Everything the painter needs to colour a card, already resolved to sRGB. */
export type CardPalette = {
  /** The wash's four shader colours, in the same roles the backdrop uses. */
  base: Rgb;
  accentA: Rgb;
  accentB: Rgb;
  light: Rgb;
  /** The plate the top match sits on, and the hairline around it. */
  surface: Rgb;
  border: Rgb;
  text: Rgb;
  textMuted: Rgb;
  /** The bar under the top match. */
  bar: Rgb;
  /** How opaque the winner's plate is over the wash. */
  surfaceAlpha: number;
};

/**
 * The theme tokens a palette is built from — the same four the backdrop reads,
 * plus the text pair. Supplied by the caller (read off the DOM in the app,
 * hardcoded in a test) so this module never touches the document.
 */
export type ThemeColors = {
  page: Rgb;
  surface: Rgb;
  text: Rgb;
  textMuted: Rgb;
  border: Rgb;
  agree: Rgb;
  disagree: Rgb;
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

const WHITE: Rgb = [255, 255, 255];
/** Not black: a hair of blue keeps a red-seeded card from going muddy brown. */
const INK: Rgb = [8, 10, 20];

/**
 * A brand-coloured card, built from one seed.
 *
 * Rather than hand-picking a fifth and sixth palette, the agree and disagree
 * themes are *derived* from whichever colours the active theme already calls
 * agree and disagree — so a partner theme gets its own two colourways for free,
 * and they cannot drift from the answer buttons they are named after.
 *
 * The construction is deliberately dark-forward: a saturated hue is only
 * legible under white text once it has been taken most of the way to ink, and a
 * story posted to a phone is looked at in a dark feed more often than not.
 */
function seededPalette(seed: Rgb, counterpart: Rgb): CardPalette {
  return {
    base: mix(seed, INK, 0.78),
    // The two wash accents stay the seed's own hue at two depths rather than
    // pulling in the counterpart at full strength — a card called "agree"
    // should not have a red blob in the corner. A trace of it is enough to
    // keep the wash from reading as one flat vignette.
    accentA: mix(seed, WHITE, 0.12),
    accentB: mix(mix(seed, counterpart, 0.22), INK, 0.35),
    light: mix(seed, WHITE, 0.3),
    surface: mix(seed, WHITE, 0.16),
    border: mix(seed, WHITE, 0.42),
    text: WHITE,
    textMuted: mix(seed, WHITE, 0.72),
    bar: WHITE,
    // Lower than the neutral themes': the plate here is a light shape on a
    // dark card, and at full opacity it would out-shout the ranking on it.
    surfaceAlpha: 0.16,
  };
}

/** Build the palette for one theme option out of the live theme's tokens. */
export function cardPalette(theme: CardTheme, colors: ThemeColors): CardPalette {
  if (theme === 'agree') return seededPalette(colors.agree, colors.disagree);
  if (theme === 'disagree') return seededPalette(colors.disagree, colors.agree);

  return {
    base: colors.page,
    accentA: colors.agree,
    accentB: colors.disagree,
    light: colors.surface,
    surface: colors.surface,
    border: colors.border,
    text: colors.text,
    textMuted: colors.textMuted,
    bar: colors.agree,
    // The plate is the card colour on the page colour — the same relationship
    // it has on screen, where it is opaque — so it is drawn opaque here too.
    surfaceAlpha: 0.92,
  };
}

/**
 * How strongly each blob can pull the base, straight out of the fragment
 * shader's own `mix` calls, at a blob weight of 1. The wash never actually
 * reaches all three ceilings in the same pixel, so this is a bound rather than
 * a colour that appears on the card.
 */
const WASH_CEILING = { accentA: 0.38, accentB: 0.36, light: 1 } as const;

/**
 * The lightest the card can get behind its text.
 *
 * Text is drawn on the wash, not on a flat fill, so "is this legible" is a
 * question about the wash's brightest reachable pixel — the accents lifting the
 * base, then the light blob lifting that, then the winner's translucent plate
 * on top. Exported so the contrast this palette promises is something a test
 * can hold it to rather than something the eye has to catch.
 */
export function brightestWash(palette: CardPalette, intensity: number, lightStrength: number): Rgb {
  let color = mix(palette.base, palette.accentA, WASH_CEILING.accentA * intensity);
  color = mix(color, palette.accentB, WASH_CEILING.accentB * intensity);
  color = mix(color, palette.light, WASH_CEILING.light * lightStrength);
  return mix(color, palette.surface, palette.surfaceAlpha);
}

/** The 0–1 triple the shader wants, from the 0–255 one everything else uses. */
export function toShaderRgb(color: Rgb): [number, number, number] {
  return [color[0] / 255, color[1] / 255, color[2] / 255];
}

/** `rgb(r g b)`, optionally with alpha — what the 2D canvas wants. */
export function css(color: Rgb, alpha = 1): string {
  return alpha >= 1
    ? `rgb(${color[0]} ${color[1]} ${color[2]})`
    : `rgb(${color[0]} ${color[1]} ${color[2]} / ${alpha})`;
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
