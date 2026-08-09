import {
  type Calculator,
  type District,
  type Election,
  getFixtureIndex,
  getPardubiceCalculator,
} from '@vk/core';
import { getSiteDataConfig } from '../config/site';
import { loadPlatformCalculator } from './platform-data';

/**
 * Calculator lookup.
 *
 * Two sources, chosen by configuration: with `DATA_ENDPOINT` set, calculators
 * come from the production data CDN (see `lib/platform-data.ts`), enumerated
 * by the site config since the CDN publishes no index. Without it, the app
 * runs on the committed archive fixtures — the dev and test default.
 *
 * Everything is async so the page above stays indifferent to the source; the
 * fixture branch resolves synchronously underneath.
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
export async function loadCalculator(
  electionKey: string,
  district: string,
): Promise<Calculator | null> {
  const config = getSiteDataConfig();

  if (config) {
    const election = config.elections.find((e) => e.key === electionKey);
    const entry = election?.calculators.find((c) => c.key === district);
    if (!election || !entry) return null;
    return loadPlatformCalculator(config.endpoint, election, entry);
  }

  if (electionKey !== 'komunalni-2022') return null;

  const calculator = getPardubiceCalculator();
  const matches =
    district === calculator.districtCode || district === slugifyDistrict(calculator.name);

  return matches ? calculator : null;
}

/** Every calculator that can be prerendered. */
export async function listAvailableCalculators(): Promise<
  { electionKey: string; district: string }[]
> {
  const config = getSiteDataConfig();

  if (config) {
    return config.elections.flatMap((election) =>
      election.calculators.map((entry) => ({ electionKey: election.key, district: entry.key })),
    );
  }

  const calculator = getPardubiceCalculator();
  return [{ electionKey: calculator.electionId, district: slugifyDistrict(calculator.name) }];
}

export async function loadElection(electionKey: string): Promise<Election | null> {
  const config = getSiteDataConfig();

  if (config) {
    const election = config.elections.find((e) => e.key === electionKey);
    if (!election) return null;
    return {
      id: election.key,
      key: election.key,
      name: election.name,
      description: election.description,
      districtKind: election.districtKind,
    };
  }

  return getFixtureIndex().elections.find((e) => e.key === electionKey) ?? null;
}

export type DistrictListing = District & { slug: string; available: boolean };

/**
 * Every district in an election, each flagged with whether we hold its data.
 *
 * On the platform source every configured entry is available by definition —
 * the config *is* the availability list. On fixtures, the index lists all 35
 * komunální cities but only Pardubice is committed, so the picker has to say
 * which rows lead anywhere.
 */
export async function listDistricts(electionKey: string): Promise<DistrictListing[]> {
  const config = getSiteDataConfig();

  if (config) {
    const election = config.elections.find((e) => e.key === electionKey);
    if (!election) return [];
    return election.calculators.map((entry) => ({
      electionId: election.key,
      code: entry.key,
      name: entry.name,
      showCode: false,
      slug: entry.key,
      available: true,
    }));
  }

  const results: DistrictListing[] = [];
  for (const district of getFixtureIndex().districts.filter((d) => d.electionId === electionKey)) {
    const slug = slugifyDistrict(district.name);
    const available = (await loadCalculator(electionKey, slug)) !== null;
    results.push({ ...district, slug, available });
  }
  return results;
}
