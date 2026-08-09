import { describe, expect, it } from 'vitest';
import { listDistricts, listElections, loadCalculator } from './calculators';

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
