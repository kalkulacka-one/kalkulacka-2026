import { type Calculator, type Election, getFixtureIndex, getPardubiceCalculator } from '@vk/core';

/**
 * Calculator lookup.
 *
 * Backed by committed fixtures for now. When the real backend lands this
 * becomes a fetch and everything above it is unchanged — which is the reason
 * pages ask for a calculator through here rather than importing fixtures.
 */

/** URL-friendly district slug, e.g. "Praha hl. m." -> "praha-hl-m". */
export function slugifyDistrict(name: string): string {
  return (
    name
      .normalize('NFD')
      // Combining diacritical marks (U+0300–U+036F), written as an escape rather
      // than typed literally — a typed range is invisible in review and a
      // reformat can eat it.
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/** Districts are addressable by slug or by their official code. */
export function loadCalculator(electionKey: string, district: string): Calculator | null {
  if (electionKey !== 'komunalni-2022') return null;

  const calculator = getPardubiceCalculator();
  const matches =
    district === calculator.districtCode || district === slugifyDistrict(calculator.name);

  return matches ? calculator : null;
}

/** Every calculator that can be prerendered. Only Pardubice exists so far. */
export function listAvailableCalculators(): { electionKey: string; district: string }[] {
  const calculator = getPardubiceCalculator();
  return [{ electionKey: calculator.electionId, district: slugifyDistrict(calculator.name) }];
}

export function loadElection(electionKey: string): Election | null {
  return getFixtureIndex().elections.find((e) => e.key === electionKey) ?? null;
}

/**
 * Every district in an election, each flagged with whether we hold its data.
 *
 * The index lists all 35 komunální cities but only Pardubice is committed, so
 * the picker has to say which rows lead anywhere. Once the real backend lands
 * `available` becomes true for all of them and nothing above this changes.
 */
export function listDistricts(electionKey: string) {
  return getFixtureIndex()
    .districts.filter((d) => d.electionId === electionKey)
    .map((d) => {
      const slug = slugifyDistrict(d.name);
      return { ...d, slug, available: loadCalculator(electionKey, slug) !== null };
    });
}
