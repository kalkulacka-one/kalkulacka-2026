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
export type CalculatorRef = {
  electionKey: string;
  district: string;
  /**
   * Present while rendering inside a partner iframe (`/embed/<partner>/…`).
   * Riding in the ref is what keeps every link in the flow under the embed
   * prefix without any call site knowing embeds exist — `buildRoute` in
   * `@vk/core` prepends it whenever it is set.
   */
  embed?: string;
};

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

export function electionPath(electionKey: string, embed?: string): string {
  return buildRoute({ kind: 'election', electionKey, embed }, routeSlugs());
}

export function questionPath(ref: CalculatorRef, questionNumber: number): string {
  return coreQuestionPath(ref, questionNumber, routeSlugs());
}

/**
 * The address offered alongside a shared image, absolute so it survives
 * leaving the tab.
 *
 * Deliberately `stepPath(ref, 'intro')`, never the results page the sender is
 * standing on: a recipient who opens `…/vysledek` would see the *sender's*
 * ranking, not a blank calculator waiting for their own answers, which is the
 * whole point of sharing it in the first place. `origin` is a parameter
 * rather than read from `window` here because this module has no DOM to read
 * one from — the caller (already client-side, already past hydration) is the
 * one that knows it.
 *
 * Anything leaving the app drops the embed prefix (`canonicalRef`): a link
 * shared out of a partner's iframe should open the full site, not a
 * chrome-stripped embed orphaned from the page it was designed to sit in.
 */
export function shareIntroUrl(origin: string, ref: CalculatorRef): string {
  return new URL(stepPath(canonicalRef(ref), 'intro'), origin).toString();
}

/** The same calculator, addressed outside any embed. */
export function canonicalRef(ref: CalculatorRef): CalculatorRef {
  return { electionKey: ref.electionKey, district: ref.district };
}
