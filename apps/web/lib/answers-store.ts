'use client';

import {
  type AnswerMap,
  type AnswerValue,
  setAnswer as applySetAnswer,
  skipQuestion as applySkip,
  toggleImportant as applyToggleImportant,
} from '@vk/core';
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

/** Empty until the persisted state has loaded, so SSR and the client agree. */
export function useCalculatorAnswers(calculatorId: string): AnswerMap {
  return useAnswersStore((state) => state.byCalculator[calculatorId]) ?? {};
}
