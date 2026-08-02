import { buildRoute, type FlowStep, questionPath } from '@vk/core';

/**
 * Every link in the flow, built from one place.
 *
 * The route grammar lives in `@vk/core`; this is only the app-side convenience
 * of not re-typing `{ kind: 'calculator', electionKey, district }` at every call
 * site. Nothing here knows what a slug looks like — that stays in the parser.
 */
export type CalculatorRef = { electionKey: string; district: string };

export function stepPath(ref: CalculatorRef, step: FlowStep, param?: string): string {
  return buildRoute({ kind: 'calculator', ...ref, step, ...(param ? { param } : {}) });
}

export function electionPath(electionKey: string): string {
  return buildRoute({ kind: 'election', electionKey });
}

export { questionPath };
