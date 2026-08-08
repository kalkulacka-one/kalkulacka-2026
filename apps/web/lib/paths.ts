import { buildRoute, type FlowStep, questionPath } from '@vk/core';

/**
 * Every link in the flow, built from one place.
 *
 * The route grammar lives in `@vk/core`; this is only the app-side convenience
 * of not re-typing `{ kind: 'calculator', electionKey, district }` at every call
 * site. Nothing here knows what a slug looks like — that stays in the parser.
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

export function stepPath(ref: CalculatorRef, step: FlowStep, param?: string): string {
  return buildRoute({ kind: 'calculator', ...ref, step, ...(param ? { param } : {}) });
}

export function electionPath(electionKey: string): string {
  return buildRoute({ kind: 'election', electionKey });
}

export { questionPath };
