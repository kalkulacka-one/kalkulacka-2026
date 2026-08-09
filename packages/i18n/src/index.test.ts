import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activeLocale,
  type DistrictKind,
  districtVocabulary,
  FALLBACK_DISTRICT_KIND,
  percent,
  plural,
  routeSlugs,
} from './index';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('activeLocale', () => {
  it('defaults to cs when NEXT_PUBLIC_LOCALE is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_LOCALE', undefined);
    expect(activeLocale()).toBe('cs');
  });

  it('accepts a registered locale', () => {
    vi.stubEnv('NEXT_PUBLIC_LOCALE', 'cs');
    expect(activeLocale()).toBe('cs');
  });

  it('throws naming the env var and the known locales for an unregistered value', () => {
    vi.stubEnv('NEXT_PUBLIC_LOCALE', 'xx');
    expect(() => activeLocale()).toThrow(/NEXT_PUBLIC_LOCALE/);
    expect(() => activeLocale()).toThrow(/cs/);
  });
});

describe('routeSlugs', () => {
  it('returns the cs slug table', () => {
    expect(routeSlugs('cs')).toMatchObject({
      elections: 'volby',
      embed: 'embed',
      steps: {
        intro: 'uvod',
        guide: 'navod',
        question: 'otazka',
        review: 'rekapitulace',
        result: 'vysledek',
        comparison: 'porovnani',
      },
    });
  });

  it('defaults to the active locale', () => {
    vi.stubEnv('NEXT_PUBLIC_LOCALE', 'cs');
    expect(routeSlugs()).toEqual(routeSlugs('cs'));
  });
});

describe('percent', () => {
  it('rounds and joins the sign with a non-breaking space', () => {
    expect(percent(62.6)).toBe('63\u00a0%');
  });
});

describe('plural', () => {
  const forms = { one: '{count} otázka', few: '{count} otázky', many: '{count} otázek' };

  it('picks the one form for 1', () => {
    expect(plural(1, forms)).toBe('1 otázka');
  });

  it('picks the few form for 2–4', () => {
    expect(plural(2, forms)).toBe('2 otázky');
    expect(plural(4, forms)).toBe('4 otázky');
  });

  it('picks the many form for 0 and 5+', () => {
    expect(plural(0, forms)).toBe('0 otázek');
    expect(plural(5, forms)).toBe('5 otázek');
  });

  /* Non-integers take the few form, matching CLDR — see the comment on `pluralCategory`. */
  it('picks the few form for a non-integer', () => {
    expect(plural(1.5, forms)).toBe('1.5 otázky');
  });
});

describe('districtVocabulary', () => {
  it('speaks of calculators, not places, for a variant election', () => {
    const copy = districtVocabulary('variant');

    expect(copy.title).toBe('Vyberte kalkulačku');
    expect(copy.searchPlaceholder).toContain('kalkulačky');
  });

  /*
   * The union makes this unreachable from typed code, which is exactly why it
   * needs a test: the branch exists for a kind that arrives from data — a
   * hand-edited or future JSON site config — and it must degrade to readable
   * copy rather than throw on `undefined.title`.
   */
  it('falls back when data names a kind the catalog has never heard of', () => {
    const unknown = 'valasztokerulet' as DistrictKind;

    expect(districtVocabulary(unknown)).toEqual(districtVocabulary(FALLBACK_DISTRICT_KIND));
  });
});
