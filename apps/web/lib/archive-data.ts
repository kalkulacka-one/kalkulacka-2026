import 'server-only';
import {
  adaptArchiveCalculator,
  adaptArchiveIndex,
  type Calculator,
  type CalculatorIndex,
} from '@vk/core';
import { cache } from 'react';

/**
 * Fetching for the archive data format: one index file plus one JSON file per
 * calculator at `{endpoint}/{election}/{districtCode}.json`, validated and
 * adapted in `@vk/core` — the same adapter the committed fixtures go through.
 *
 * The archive is a finished corpus, so the revalidate window is generous; it
 * exists only so a hiccup on the archive host heals without a redeploy.
 */
const REVALIDATE_SECONDS = 3600;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

export const loadArchiveIndex = cache(async (endpoint: string): Promise<CalculatorIndex | null> => {
  try {
    return adaptArchiveIndex(await fetchJson(`${endpoint}/calculators.json`));
  } catch (error) {
    console.error('Failed to load archive index:', error);
    return null;
  }
});

export const loadArchiveCalculator = cache(
  async (
    endpoint: string,
    electionKey: string,
    districtCode: string,
  ): Promise<Calculator | null> => {
    try {
      const raw = await fetchJson(`${endpoint}/${electionKey}/${districtCode}.json`);
      return adaptArchiveCalculator(raw);
    } catch (error) {
      console.error(`Failed to load archive calculator ${electionKey}/${districtCode}:`, error);
      return null;
    }
  },
);
