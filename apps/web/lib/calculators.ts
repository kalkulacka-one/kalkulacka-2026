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
import { getArchiveDemoConfig } from '../config/archive-demo';
import { getSiteDataConfig } from '../config/site';
import { loadArchiveCalculator, loadArchiveIndex } from './archive-data';
import { loadPlatformCalculator } from './platform-data';

/**
 * The archive-demo slice for one election: its index entry and districts,
 * or null when the demo is off, the key isn't part of it, or the archive is
 * unreachable. Elections the demo serves shadow the other sources for their
 * keys — the fixture path also knows `komunalni-2022`, and answering the same
 * key from two places would list Pardubice twice.
 */
async function archiveDemoElection(electionKey: string) {
  const demo = getArchiveDemoConfig();
  const entry = demo?.elections.find((e) => e.key === electionKey);
  if (!demo || !entry) return null;

  const index = await loadArchiveIndex(demo.endpoint);
  const election = index?.elections.find((e) => e.key === electionKey);
  if (!index || !election) return null;

  /*
   * Archive district names are not unique — senate obvody 55 and 58 are both
   * "Brno - město" — and the slug is derived from the name, so duplicates
   * would produce two picker rows linking to the same calculator. The first
   * keeps the plain slug; later ones get their code appended (the code is the
   * unique key, and for senate districts it is already on the row as a badge).
   */
  const seen = new Set<string>();
  const districts = index.districts
    .filter((d) => d.electionId === election.id)
    .map((d) => {
      const slug = seen.has(d.slug) ? `${d.slug}-${d.code}` : d.slug;
      seen.add(d.slug);
      return { ...d, slug };
    });

  return {
    endpoint: demo.endpoint,
    election: { ...election, description: entry.description },
    districts,
  };
}

/** The demo's election keys — for keeping other sources' lists clear of them. */
function archiveDemoKeys(): Set<string> {
  return new Set(getArchiveDemoConfig()?.elections.map((e) => e.key));
}

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
  const demo = await archiveDemoElection(electionKey);
  if (demo) {
    const row = demo.districts.find((d) => d.slug === district || d.code === district);
    if (!row) return null;
    return loadArchiveCalculator(demo.endpoint, electionKey, row.code);
  }

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
  const demoKeys = archiveDemoKeys();
  const demoEntries: { electionKey: string; district: string }[] = [];
  for (const key of demoKeys) {
    const demo = await archiveDemoElection(key);
    if (!demo) continue;
    demoEntries.push(...demo.districts.map((d) => ({ electionKey: key, district: d.slug })));
  }

  const config = getSiteDataConfig();

  if (config) {
    return config.elections
      .filter((election) => !demoKeys.has(election.key))
      .flatMap((election) =>
        election.calculators.map((entry) => ({ electionKey: election.key, district: entry.key })),
      )
      .concat(demoEntries);
  }

  const calculator = fixtureCalculator();
  const fixtureEntries = demoKeys.has(calculator.electionId)
    ? []
    : [{ electionKey: calculator.electionId, district: slugifyDistrict(calculator.name) }];
  return fixtureEntries.concat(demoEntries);
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
  const demoKeys = archiveDemoKeys();
  const demoListings: ElectionListing[] = [];
  for (const key of demoKeys) {
    const demo = await archiveDemoElection(key);
    if (!demo) continue;
    demoListings.push({
      key,
      name: demo.election.name,
      description: demo.election.description,
      districtKind: demo.election.districtKind,
      available: demo.districts.map((d) => ({ slug: d.slug })),
    });
  }

  const config = getSiteDataConfig();

  if (config) {
    // Every configured entry is available by definition — the config *is* the
    // availability list — so this needs no data access at all.
    return config.elections
      .filter((election) => election.calculators.length > 0 && !demoKeys.has(election.key))
      .map(
        (election): ElectionListing => ({
          key: election.key,
          name: election.name,
          description: election.description,
          districtKind: election.districtKind,
          available: election.calculators.map((entry) => ({ slug: entry.key })),
        }),
      )
      .concat(demoListings);
  }

  const listings: ElectionListing[] = [];
  for (const election of getFixtureIndex().elections) {
    if (demoKeys.has(election.key)) continue;
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
  return listings.concat(demoListings);
}

/** Every election the picker can list — the sitemap's other landing page. */
export async function listElections(): Promise<{ key: string }[]> {
  const demoKeys = archiveDemoKeys();
  const demoElections = [...demoKeys].map((key) => ({ key }));

  const config = getSiteDataConfig();

  if (config) {
    return config.elections
      .filter((election) => !demoKeys.has(election.key))
      .map((election) => ({ key: election.key }))
      .concat(demoElections);
  }

  return getFixtureIndex()
    .elections.filter((election) => !demoKeys.has(election.key))
    .map((election) => ({ key: election.key }))
    .concat(demoElections);
}

export async function loadElection(electionKey: string): Promise<Election | null> {
  const demo = await archiveDemoElection(electionKey);
  if (demo) return demo.election;

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
  const demo = await archiveDemoElection(electionKey);
  if (demo) {
    // The archive is a finished corpus — every listed district resolves.
    return demo.districts.map((district) => ({ ...district, available: true }));
  }

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
