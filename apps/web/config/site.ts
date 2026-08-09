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
  /** Key under the group on the CDN, e.g. "kalkulacka" — also the URL slug. */
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
   * TODO(A3): snemovní calculators are *variants* of one nationwide election,
   * not districts of it — the closed municipality/senate union cannot say so
   * yet. Until A3 generalizes the axis, variants ride in the district slot.
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
    districtKind: 'municipality',
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
