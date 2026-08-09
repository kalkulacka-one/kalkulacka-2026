import type { DistrictKind } from '@vk/core';

/**
 * Site configuration — the seed of the per-country config module (plan Phase F).
 *
 * The data CDN serves six JSON files per calculator but no index of what
 * exists (the previous platform hardcoded its homepage links instead), so the
 * list of elections and calculators is site configuration, as are their
 * display names — `calculator.json` carries no election title at all.
 */

export type SiteCalculatorEntry = {
  /**
   * Key under the group on the CDN, e.g. "kalkulacka" — and the URL slug, taken
   * as-is rather than slugified from `name`: it is already the identifier the
   * data is published under, and it is ASCII where a display name may not be.
   */
  key: string;
  /** Display name; the CDN data has no title field for this. */
  name: string;
};

export type SiteElectionEntry = {
  /** Election key — the CDN group directory and the URL segment. */
  key: string;
  name: string;
  description?: string;
  /**
   * What the picker is a picker *of* — and so which vocabulary it speaks. The
   * kinds are the `picker.*` sections of the message catalog; a country whose
   * elections divide up some way Czech has no word for adds a section there and
   * names it here.
   */
  districtKind: DistrictKind;
  calculators: SiteCalculatorEntry[];
};

export type SiteDataConfig = {
  endpoint: string;
  elections: SiteElectionEntry[];
};

/*
 * Display names below are provisional (review break 1) — taken from the
 * previous platform's homepage, not from data.
 */
const ELECTIONS: SiteElectionEntry[] = [
  {
    key: 'snemovni-2025',
    name: 'Sněmovní volby 2025',
    // One nationwide election, seven calculators — the choice is which
    // calculator, not where you vote.
    districtKind: 'variant',
    calculators: [
      { key: 'kalkulacka', name: 'Volební kalkulačka' },
      { key: 'expresni', name: 'Expresní kalkulačka' },
      { key: 'pro-mlade', name: 'Kalkulačka pro mladé' },
      { key: 'ultimatni', name: 'Ultimátní kalkulačka' },
      { key: 'inventura', name: 'Inventura hlasování' },
      { key: 'klimaticka', name: 'Klimatická kalkulačka' },
      { key: 'kompas', name: 'Volební kompas' },
    ],
  },
];

/** Null when no endpoint is configured — the app then runs on fixtures. */
export function getSiteDataConfig(): SiteDataConfig | null {
  const endpoint = process.env.DATA_ENDPOINT;
  if (!endpoint) return null;
  return { endpoint: endpoint.replace(/\/+$/, ''), elections: ELECTIONS };
}
