import {
  type Calculator,
  type District,
  type DistrictKind,
  type Election,
  getFixtureIndex,
  getPardubiceCalculator,
  slugifyDistrict,
} from '@vk/core';
import { cache } from 'react';
import { getSiteDataConfig } from '../config/site';
import { loadPlatformCalculator } from './platform-data';

/**
 * The one committed fixture, parsed once per request rather than per lookup.
 *
 * `getPardubiceCalculator()` runs the whole archive file through Zod every time
 * it is called, and the availability scan below asks for it once per district —
 * 35 times for the komunální index alone, and the homepage repeats that for
 * every election in the index. `cache()` collapses all of them into one parse.
 */
const fixtureCalculator = cache(getPardubiceCalculator);

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

  const calculator = fixtureCalculator();
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

  const calculator = fixtureCalculator();
  return [{ electionKey: calculator.electionId, district: slugifyDistrict(calculator.name) }];
}

/** One election as the homepage lists it. */
export type ElectionListing = {
  key: string;
  name: string;
  description?: string;
  districtKind: DistrictKind;
  /** The calculators in it we actually hold data for — never empty. */
  available: { slug: string }[];
};

/**
 * Every election with at least one calculator ready — the homepage's list.
 *
 * Elections with nothing behind them are dropped rather than listed as
 * "Připravujeme": the picker already says that about individual rows, and on
 * fixtures three of the four archive elections have no committed data at all,
 * so keeping them would make the front door mostly dead ends.
 *
 * The description is deliberately taken from site config only. The fixture
 * index carries one too, but it is 2022 archive marketing with Markdown
 * emphasis in it ("kalkulačky pro **35** měst") and it describes a corpus we do
 * not serve — rendering it would print the asterisks and claim 35 calculators
 * where one exists.
 */
export async function listReadyElections(): Promise<ElectionListing[]> {
  const config = getSiteDataConfig();

  if (config) {
    // Every configured entry is available by definition — the config *is* the
    // availability list — so this needs no data access at all.
    return config.elections
      .filter((election) => election.calculators.length > 0)
      .map((election) => ({
        key: election.key,
        name: election.name,
        description: election.description,
        districtKind: election.districtKind,
        available: election.calculators.map((entry) => ({ slug: entry.key })),
      }));
  }

  const listings: ElectionListing[] = [];
  for (const election of getFixtureIndex().elections) {
    const available = (await listDistricts(election.key))
      .filter((district) => district.available)
      .map((district) => ({ slug: district.slug }));

    if (available.length > 0) {
      listings.push({
        key: election.key,
        name: election.name,
        districtKind: election.districtKind,
        available,
      });
    }
  }
  return listings;
}

/** Every election the picker can list — the sitemap's other landing page. */
export async function listElections(): Promise<{ key: string }[]> {
  const config = getSiteDataConfig();

  if (config) {
    return config.elections.map((election) => ({ key: election.key }));
  }

  return getFixtureIndex().elections.map((election) => ({ key: election.key }));
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

export type DistrictListing = District & { available: boolean };

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
    const available = (await loadCalculator(electionKey, district.slug)) !== null;
    results.push({ ...district, available });
  }
  return results;
}
