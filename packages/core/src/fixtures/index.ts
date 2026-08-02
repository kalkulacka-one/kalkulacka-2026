import { adaptArchiveCalculator, adaptArchiveIndex } from '../adapters/archive';
import type { Calculator, CalculatorIndex } from '../domain/types';
import rawIndex from './data/calculators.json' with { type: 'json' };
import rawPardubice from './data/komunalni-2022-555134.json' with { type: 'json' };
import { PARDUBICE_TOPICS } from './topics';

/**
 * Real archive data, committed so the whole flow is testable without a network
 * call — and so the awkward cases stay in front of us rather than appearing for
 * the first time in production.
 *
 * Pardubice is a genuinely useful sample: 42 questions, 9 candidates, and one
 * (KSČM) that never answered.
 */

export function getFixtureIndex(): CalculatorIndex {
  return adaptArchiveIndex(rawIndex);
}

export function getPardubiceCalculator(): Calculator {
  return adaptArchiveCalculator(rawPardubice, { topics: PARDUBICE_TOPICS });
}

export { PARDUBICE_TOPICS };
