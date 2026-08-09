'use client';

import {
  type AnswerMap,
  type AnswerValue,
  setAnswer as applySetAnswer,
  skipQuestion as applySkip,
  toggleImportant as applyToggleImportant,
} from '@vk/core';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Answers, kept per calculator so switching city does not clobber progress.
 *
 * The transitions themselves live in @vk/core as pure functions; this is only
 * the React binding plus persistence. When answers move server-side, the
 * storage adapter changes and the rest of the app does not.
 */
type AnswersState = {
  byCalculator: Record<string, AnswerMap>;
  setAnswer: (calculatorId: string, questionId: string, answer: AnswerValue) => void;
  skipQuestion: (calculatorId: string, questionId: string) => void;
  toggleImportant: (calculatorId: string, questionId: string) => void;
  /**
   * Take a whole answer map over from somewhere else — today, the anonymous
   * session on the server (`lib/session-sync`).
   *
   * Not a merge and not for the screens: the one caller only ever uses it when
   * this calculator has no local answers at all, so there is nothing here to
   * reconcile. Anything the user has already answered on this device wins, and
   * wins by never reaching this function.
   */
  adoptAnswers: (calculatorId: string, answers: AnswerMap) => void;
  resetCalculator: (calculatorId: string) => void;
};

export const useAnswersStore = create<AnswersState>()(
  persist(
    (set) => ({
      byCalculator: {},

      setAnswer: (calculatorId, questionId, answer) =>
        set((state) => ({
          byCalculator: {
            ...state.byCalculator,
            [calculatorId]: applySetAnswer(
              state.byCalculator[calculatorId] ?? {},
              questionId,
              answer,
            ),
          },
        })),

      skipQuestion: (calculatorId, questionId) =>
        set((state) => ({
          byCalculator: {
            ...state.byCalculator,
            [calculatorId]: applySkip(state.byCalculator[calculatorId] ?? {}, questionId),
          },
        })),

      toggleImportant: (calculatorId, questionId) =>
        set((state) => ({
          byCalculator: {
            ...state.byCalculator,
            [calculatorId]: applyToggleImportant(
              state.byCalculator[calculatorId] ?? {},
              questionId,
            ),
          },
        })),

      adoptAnswers: (calculatorId, answers) =>
        set((state) => ({
          byCalculator: { ...state.byCalculator, [calculatorId]: answers },
        })),

      resetCalculator: (calculatorId) =>
        set((state) => {
          const { [calculatorId]: _dropped, ...rest } = state.byCalculator;
          return { byCalculator: rest };
        }),
    }),
    {
      name: 'vk-answers',
      version: 1,
    },
  ),
);

/** Stable reference so an unanswered calculator doesn't defeat downstream memoization. */
const EMPTY_ANSWERS: AnswerMap = {};

/** Empty until the persisted state has loaded, so SSR and the client agree. */
export function useCalculatorAnswers(calculatorId: string): AnswerMap {
  return useAnswersStore((state) => state.byCalculator[calculatorId]) ?? EMPTY_ANSWERS;
}

/**
 * Whether the persisted answers can be trusted yet.
 *
 * `localStorage` is synchronous, so the store already holds the saved answers
 * by the time the client's first render runs — but the server rendered that
 * same markup with none of them. Reading them during that first pass is exactly
 * the hydration mismatch React complains about, so this returns `false` until
 * after mount and screens that draw a *conclusion* from the answers ("nothing
 * to compare", "Začít" vs "Pokračovat") wait for it. Screens that merely
 * display answers do not need to: an empty state and an unanswered one look the
 * same.
 *
 * Deliberately not `persist.hasHydrated()` — that reports on the middleware's
 * internals, which is a different question from "is it safe to render this
 * yet", and it is the wrong answer during SSR.
 */
export function useAnswersReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  return ready;
}
