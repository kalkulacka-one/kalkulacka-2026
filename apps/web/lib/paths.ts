import { buildRoute, questionPath as coreQuestionPath, type FlowStep } from '@vk/core';
import { routeSlugs } from '@vk/i18n';

/**
 * Every link in the flow, built from one place.
 *
 * The route grammar lives in `@vk/core`; this is only the app-side convenience
 * of not re-typing `{ kind: 'calculator', electionKey, district }` at every call
 * site, and of supplying the active locale's slugs so nothing downstream has
 * to know the app is Czech-only today.
 */
export type CalculatorRef = { electionKey: string; district: string };

/**
 * What the shell (`Screen`/`AppShell`) needs to know about the open
 * calculator — display strings for the header plus enough to build its menu's
 * links. One object instead of three same-shaped props threaded separately
 * through every screen: `electionName`, `calculatorName` and a `calculator`
 * ref were always sourced from the same `Calculator` at the call site anyway.
 */
export type CalculatorShellInfo = {
  id: string;
  name: string;
  electionName: string;
} & CalculatorRef;

/** Builds `CalculatorShellInfo` from a loaded calculator and its route ref — the one shape every call site was hand-assembling. */
export function shellInfoOf(
  calculator: { id: string; name: string; electionName: string },
  ref: CalculatorRef,
): CalculatorShellInfo {
  return {
    id: calculator.id,
    name: calculator.name,
    electionName: calculator.electionName,
    ...ref,
  };
}

export function stepPath(ref: CalculatorRef, step: FlowStep, param?: string): string {
  return buildRoute(
    { kind: 'calculator', ...ref, step, ...(param ? { param } : {}) },
    routeSlugs(),
  );
}

export function electionPath(electionKey: string): string {
  return buildRoute({ kind: 'election', electionKey }, routeSlugs());
}

export function questionPath(ref: CalculatorRef, questionNumber: number): string {
  return coreQuestionPath(ref, questionNumber, routeSlugs());
}
