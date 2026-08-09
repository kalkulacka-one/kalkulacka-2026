'use client';

import type { CandidateResult } from '@vk/core';
import { useEffect } from 'react';
import { type CalculatorSyncTarget, saveResults, startCalculatorSync } from './session-sync';

/**
 * The React side of `session-sync` — two effects and nothing else.
 *
 * Everything with a decision in it lives in the plain module next door, so the
 * behaviour is testable without rendering anything and the screens keep reading
 * `useAnswersStore` exactly as they did before sync existed.
 *
 * Targets are taken apart into primitives rather than depended on as an object:
 * the caller builds a fresh one every render, and an object identity in the
 * dependency array would restart the whole session on every keystroke.
 */
export function useCalculatorSync({
  calculatorId,
  calculatorGroup,
  calculatorKey,
  calculatorVersion,
}: CalculatorSyncTarget): void {
  useEffect(
    () => startCalculatorSync({ calculatorId, calculatorGroup, calculatorKey, calculatorVersion }),
    [calculatorId, calculatorGroup, calculatorKey, calculatorVersion],
  );
}

/**
 * Save the finished ranking once it exists.
 *
 * `results` is `undefined` until the screen is willing to stand behind it —
 * before the persisted answers have loaded, every candidate scores against an
 * empty answer map, and saving that would stamp the session complete with a
 * ranking of nothing.
 */
export function useResultsSync(
  { calculatorId, calculatorGroup, calculatorKey, calculatorVersion }: CalculatorSyncTarget,
  results: readonly CandidateResult[] | undefined,
): void {
  useEffect(() => {
    if (!results) return;
    void saveResults({ calculatorId, calculatorGroup, calculatorKey, calculatorVersion }, results);
  }, [calculatorId, calculatorGroup, calculatorKey, calculatorVersion, results]);
}
