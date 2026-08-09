import 'server-only';
import { adaptPlatformCalculator, type Calculator, type Candidate } from '@vk/core';
import { cache } from 'react';
import type { SiteCalculatorEntry, SiteElectionEntry } from '../config/site';
import { deriveLogoColor } from './logo-color';

/**
 * Fetching for the production data format: six JSON files per calculator at
 * `{endpoint}/{group}/{key}/{file}`, validated and adapted in `@vk/core`.
 */

/** The previous platform fetched uncached on every render; don't repeat that. */
const REVALIDATE_SECONDS = 600;

async function fetchJson(url: string, required: boolean): Promise<unknown> {
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) {
    if (required) throw new Error(`${url} returned ${response.status}`);
    return undefined;
  }
  return response.json();
}

/**
 * Fills in `color` for every candidate that has a logo but no authored one —
 * once per calculator load, inside the same `cache()` that memoises the rest
 * of this fetch, not once per row render. A candidate with neither an
 * `avatarUrl` nor a data colour is left untouched; `partyColor` in `@vk/ui`
 * is what turns "no colour" into something to paint with.
 */
async function withDerivedColors(candidates: Candidate[]): Promise<Candidate[]> {
  return Promise.all(
    candidates.map(async (candidate) => {
      if (candidate.color || !candidate.avatarUrl) return candidate;
      const derived = await deriveLogoColor(candidate.avatarUrl);
      return derived ? { ...candidate, color: derived } : candidate;
    }),
  );
}

export const loadPlatformCalculator = cache(
  async (
    endpoint: string,
    election: SiteElectionEntry,
    entry: SiteCalculatorEntry,
  ): Promise<Calculator | null> => {
    const base = `${endpoint}/${election.key}/${entry.key}`;

    try {
      const [calculator, questions, candidates, candidatesAnswers, persons, organizations] =
        await Promise.all([
          fetchJson(`${base}/calculator.json`, true),
          fetchJson(`${base}/questions.json`, true),
          fetchJson(`${base}/candidates.json`, true),
          fetchJson(`${base}/candidates-answers.json`, true),
          fetchJson(`${base}/persons.json`, false),
          fetchJson(`${base}/organizations.json`, false),
        ]);

      const adapted = adaptPlatformCalculator(
        { calculator, questions, candidates, candidatesAnswers, persons, organizations },
        { assetBase: base },
      );

      // Display names are site configuration — the data carries no election
      // title and no calculator title (see config/site.ts).
      return {
        ...adapted,
        candidates: await withDerivedColors(adapted.candidates),
        electionId: election.key,
        electionName: election.name,
        name: entry.name,
        districtCode: entry.key,
        assetBase: base,
      };
    } catch (error) {
      console.error(`Failed to load calculator ${election.key}/${entry.key}:`, error);
      return null;
    }
  },
);
