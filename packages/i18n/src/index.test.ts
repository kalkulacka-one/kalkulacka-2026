import { describe, expect, it } from 'vitest';
import { type DistrictKind, districtVocabulary, FALLBACK_DISTRICT_KIND } from './index';

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
