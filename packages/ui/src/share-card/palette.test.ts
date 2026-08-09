import { describe, expect, it } from 'vitest';
import { DEFAULT_INTENSITY, DEFAULT_LIGHT_STRENGTH } from '../backdrop/shader-source';
import {
  brightestWash,
  cardPalette,
  css,
  mix,
  parseColor,
  type Rgb,
  type ThemeColors,
} from './palette';

const colors: ThemeColors = {
  page: [248, 250, 252],
  surface: [255, 255, 255],
  text: [30, 41, 59],
  textMuted: [100, 116, 139],
  border: [226, 232, 240],
  agree: [37, 99, 235],
  disagree: [220, 38, 38],
};

/** Relative luminance, for the contrast assertions below. */
function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe('parseColor', () => {
  it('reads the three shapes a computed style can come back as', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('#2563eb')).toEqual([37, 99, 235]);
    expect(parseColor('rgb(37, 99, 235)')).toEqual([37, 99, 235]);
    expect(parseColor('rgba(37 99 235 / 0.5)')).toEqual([37, 99, 235]);
  });

  it('gives up rather than guessing on a colour it cannot read', () => {
    // `oklch()` and `color()` reach here from browsers that hand back the
    // authored value; the caller's own hex fallback is the right answer then.
    expect(parseColor('oklch(0.6 0.2 260)')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('mix', () => {
  it('clamps rather than wrapping past either end', () => {
    expect(mix([0, 0, 0], [255, 255, 255], 2)).toEqual([255, 255, 255]);
    expect(mix([0, 0, 0], [255, 255, 255], -1)).toEqual([0, 0, 0]);
  });
});

describe('cardPalette', () => {
  it('passes the neutral themes straight through from the tokens', () => {
    const light = cardPalette('light', colors);
    expect(light.base).toEqual(colors.page);
    expect(light.text).toEqual(colors.text);
    expect(light.accentA).toEqual(colors.agree);
    expect(light.accentB).toEqual(colors.disagree);
  });

  it.each(['agree', 'disagree'] as const)(
    'keeps white body text legible on the %s card',
    (theme) => {
      const palette = cardPalette(theme, colors);
      // Both ends of the wash, not just the flat base: the light blob is what
      // a brand card is at risk of losing its text in, and the plate under the
      // top match sits on top of that.
      expect(contrast(palette.text, palette.base)).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(palette.text, brightestWash(palette, DEFAULT_INTENSITY, DEFAULT_LIGHT_STRENGTH)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('derives the brand cards from the theme, not from fixed hexes', () => {
    const green: ThemeColors = { ...colors, agree: [22, 163, 74] };
    expect(cardPalette('agree', green).base).not.toEqual(cardPalette('agree', colors).base);
  });
});

describe('css', () => {
  it('only emits an alpha channel when there is one', () => {
    expect(css([1, 2, 3])).toBe('rgb(1 2 3)');
    expect(css([1, 2, 3], 0.5)).toBe('rgb(1 2 3 / 0.5)');
  });
});
