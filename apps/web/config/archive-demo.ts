/**
 * Demo configuration: serve the frozen 2022 archive elections alongside
 * whatever the platform config provides.
 *
 * This exists to show the komunální and senátní flows — election picker →
 * district picker → full calculator — on real data before the 2026 data
 * exists. The archive is a closed, finished corpus at
 * `archiv.volebnikalkulacka.cz`, so everything listed here is guaranteed to
 * resolve (verified: all 62 calculator files respond 200).
 *
 * Enabled on Vercel deployments (`VERCEL` is set there and nowhere else we
 * build), or explicitly via `ARCHIVE_DEMO=1`; `ARCHIVE_DEMO=0` turns it off
 * even on Vercel. CI and the local dev/e2e default stay on fixtures.
 */

export type ArchiveDemoConfig = {
  /** Root of the archive's JSON, `{endpoint}/{election}/{districtCode}.json`. */
  endpoint: string;
  /** Which archive elections the demo exposes, in homepage order. */
  elections: { key: string; description: string }[];
};

const ARCHIVE_ENDPOINT = 'https://archiv.volebnikalkulacka.cz/data/kalkulacka';

/*
 * Descriptions are ours, not the archive's — the archive index carries 2022
 * campaign copy with Markdown emphasis in it, which would render literally.
 */
const DEMO_ELECTIONS = [
  { key: 'komunalni-2022', description: 'Volba zastupitelů, kteří rozhodují o vašem městě.' },
  { key: 'senatni-2022', description: 'Volba senátora či senátorky za váš volební obvod.' },
];

export function getArchiveDemoConfig(): ArchiveDemoConfig | null {
  const flag = process.env.ARCHIVE_DEMO ?? (process.env.VERCEL ? '1' : '');
  if (flag !== '1') return null;
  return { endpoint: ARCHIVE_ENDPOINT, elections: DEMO_ELECTIONS };
}
