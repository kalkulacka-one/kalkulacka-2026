import { describe, expect, it } from 'vitest';
import { listDistricts, listElections, listReadyElections, loadCalculator } from './calculators';

/*
 * Fixture mode — no `DATA_ENDPOINT` in the test environment, which is also the
 * dev default. The slug now arrives on the domain `District` from the archive
 * adapter instead of being derived here, so these pin the URLs that were
 * already public against that move.
 */

describe('loadCalculator on fixtures', () => {
  it('resolves a district by its slug', async () => {
    expect((await loadCalculator('komunalni-2022', 'pardubice'))?.name).toBe('Pardubice');
  });

  it('resolves the same district by its official code', async () => {
    expect((await loadCalculator('komunalni-2022', '555134'))?.name).toBe('Pardubice');
  });

  it('has nothing for a district we hold no data for', async () => {
    expect(await loadCalculator('komunalni-2022', 'brno')).toBeNull();
  });
});

describe('listDistricts on fixtures', () => {
  it('carries the adapter’s slug and flags what we hold data for', async () => {
    const districts = await listDistricts('komunalni-2022');

    expect(districts.find((d) => d.name === 'Pardubice')?.slug).toBe('pardubice');
    expect(districts.filter((d) => d.available).map((d) => d.slug)).toEqual(['pardubice']);
  });
});

describe('listElections on fixtures', () => {
  it('lists every election the fixture index knows, not only the ones with data', async () => {
    const keys = (await listElections()).map((e) => e.key);
    expect(keys).toContain('komunalni-2022');
    expect(keys.length).toBeGreaterThan(1);
  });
});

/*
 * The homepage's list, which is the opposite selection to `listElections`
 * above: the sitemap wants every address that resolves, the front door wants
 * only the ones that lead to a calculator someone can actually fill in.
 */
describe('listReadyElections on fixtures', () => {
  it('drops the elections with no committed calculator behind them', async () => {
    const listings = await listReadyElections();

    expect(listings.map((e) => e.key)).toEqual(['komunalni-2022']);
    expect(listings[0]?.name).toBe('Komunální volby 2022');
  });

  it('reports only the calculators we hold data for, not every listed district', async () => {
    const [komunalni] = await listReadyElections();

    // The index lists 35 cities for this election; one of them is committed.
    expect(komunalni?.available).toEqual([{ slug: 'pardubice' }]);
  });

  it('carries no description on fixtures, so archive Markdown never reaches the page', async () => {
    // The fixture index's own description is "kalkulačky pro **35** měst…" —
    // both stale and Markdown. Site config is the only source the card trusts.
    expect((await listReadyElections())[0]?.description).toBeUndefined();
  });
});
