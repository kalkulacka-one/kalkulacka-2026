import { type Calculator, getFixtureIndex, getPardubiceCalculator } from '@vk/core';

/**
 * Calculator lookup.
 *
 * Backed by committed fixtures for now. When the real backend lands this
 * becomes a fetch and everything above it is unchanged — which is the reason
 * pages ask for a calculator through here rather than importing fixtures.
 */

/** URL-friendly district slug, e.g. "Praha hl. m." -> "praha-hl-m". */
export function slugifyDistrict(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

export function listDistricts(electionKey: string) {
  return getFixtureIndex()
    .districts.filter((d) => d.electionId === electionKey)
    .map((d) => ({ ...d, slug: slugifyDistrict(d.name) }));
}
