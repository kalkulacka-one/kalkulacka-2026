import type { AnswerMap, CandidateResult } from '@vk/core';
import { useAnswersStore } from '../answers-store';
import type { Answer } from '../api/answer-schema';
import { getRuntimeSessionId, setRuntimeSessionId } from '../session/client';
import { fromWireAnswers, isUuid, toWireAnswers } from './answer-wire';

/**
 * Answers, followed across devices — without the store above knowing.
 *
 * localStorage stays the source of truth the screens read; this mirrors it to
 * the anonymous session so a phone and a laptop that share a cookie share a
 * half-finished calculator, and so the results page has something to share
 * (task C3). Nothing here is on the path of answering a question: every call
 * is fire-and-forget and every failure is silent, because a voter who is
 * offline is still answering a calculator, not hitting an error.
 *
 * Three network calls, in this order:
 *
 * 1. `POST /api/sessions` — once per calculator per document, when a
 *    calculator screen mounts. Not on the picker: browsing districts is not
 *    entering a calculator, and a session per glance would be a session per
 *    glance in the database.
 * 2. `GET  …/session-data` — immediately after, and only then. Adopts the
 *    server's answers when the local store has none for this calculator; a
 *    non-empty local store always wins and the next save overwrites the
 *    server. No merge, no clock comparison: the device in the user's hand is
 *    the one they are looking at.
 * 3. `POST …/session-data` — on a trailing throttle while answering, on
 *    `visibilitychange`/`pagehide`, and once with `matches` when the results
 *    screen has computed them (which is what marks the session completed).
 */

export type CalculatorSyncTarget = {
  /** The platform UUID. Fixtures and archive ids are not UUIDs and never sync. */
  calculatorId: string;
  /** Election key — `calculatorGroup` on the wire, e.g. "snemovni-2025". */
  calculatorGroup: string;
  /** The calculator's own key within the election, e.g. "kalkulacka". */
  calculatorKey: string;
  /** Semver of the data this session is being answered against, when known. */
  calculatorVersion?: string;
};

type Match = { id: string; match?: number };

type SessionDataBody = {
  answers: Answer[];
  matches?: Match[];
  calculatorVersion?: string;
};

/**
 * At most one save per this long while answering.
 *
 * The safety net, not the mechanism: `visibilitychange` and `pagehide` are what
 * normally persist a session, and they cover closing the tab, switching apps
 * and locking the phone. This is only so a crash or a lost battery mid-flow
 * does not cost the whole run, so it is deliberately slow enough to be quiet —
 * roughly a dozen requests across a full 42-question calculator.
 */
const SAVE_INTERVAL_MS = 30_000;

/**
 * Sync is configured at build time.
 *
 * `NEXT_PUBLIC_SESSION_COOKIE_NAME` is inlined by Next into the client bundle,
 * so a fork that sets no backend env does not merely fail these calls — it
 * never makes them, and the whole module below stays dead code behind this one
 * `false`. That is the forkability contract: no backend, no network, no noise,
 * and localStorage behaves exactly as it did before this file existed.
 */
export function isSyncConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME);
}

export function canSync(calculatorId: string): boolean {
  return isSyncConfigured() && isUuid(calculatorId);
}

type SyncState = {
  /** Resolves to whether the session exists server-side. Never rejects. */
  ready: Promise<boolean>;
  /** The settled value of `ready`, for the unload path, which cannot await. */
  sessionExists?: boolean;
  /** Body of the last save the server acknowledged. */
  savedBody?: string;
  /** Body of the last beacon handed to the browser, which cannot be acknowledged. */
  beaconedBody?: string;
  lastSaveAt: number;
  timer?: ReturnType<typeof setTimeout>;
};

/**
 * One entry per calculator, for the life of the document.
 *
 * This is the guard that makes step 2 above run *once*. Client-side navigation
 * between intro, questions, recap and results remounts the sync hook, and a
 * second restore after "Začít znovu" — which empties the local store, making it
 * look adoptable — would hand the user back the answers they just deleted.
 */
const states = new Map<string, SyncState>();

function sessionDataUrl(calculatorId: string): string {
  return `/api/calculators/${calculatorId}/session-data`;
}

/**
 * The Bearer fallback for browsers that drop our cookie (third-party contexts,
 * mainly embeds). Empty otherwise, so the cookie is the normal path.
 */
function authHeaders(): Record<string, string> {
  const runtimeSessionId = getRuntimeSessionId();
  return runtimeSessionId ? { authorization: `Bearer ${runtimeSessionId}` } : {};
}

function currentAnswers(calculatorId: string): AnswerMap {
  return useAnswersStore.getState().byCalculator[calculatorId] ?? {};
}

function buildBody(target: CalculatorSyncTarget, matches?: Match[]): string {
  const body: SessionDataBody = { answers: toWireAnswers(currentAnswers(target.calculatorId)) };

  if (matches) body.matches = matches;
  if (target.calculatorVersion) body.calculatorVersion = target.calculatorVersion;

  return JSON.stringify(body);
}

async function initialize(target: CalculatorSyncTarget): Promise<boolean> {
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        calculatorId: target.calculatorId,
        calculatorKey: target.calculatorKey,
        calculatorGroup: target.calculatorGroup,
        ...(target.calculatorVersion ? { calculatorVersion: target.calculatorVersion } : {}),
      }),
    });

    if (!response.ok) return false;

    const body: unknown = await response.json();
    const sessionId = (body as { sessionId?: unknown } | null)?.sessionId;
    if (typeof sessionId === 'string') setRuntimeSessionId(sessionId);

    // Kept apart from the session itself: a restore that fails means nothing
    // was adopted, not that there is nowhere to save to.
    try {
      await restore(target);
    } catch {}

    return true;
  } catch {
    return false;
  }
}

function hasLocalAnswers(calculatorId: string): boolean {
  return Object.keys(currentAnswers(calculatorId)).length > 0;
}

async function restore(target: CalculatorSyncTarget): Promise<void> {
  if (hasLocalAnswers(target.calculatorId)) return;

  const response = await fetch(sessionDataUrl(target.calculatorId), { headers: authHeaders() });
  // 404 is the ordinary answer for a session that has never been saved.
  if (!response.ok) return;

  const body: unknown = await response.json();
  const stored = (body as { answers?: unknown } | null)?.answers;
  if (!Array.isArray(stored) || stored.length === 0) return;

  // Re-checked after the round trip: this runs on the question screen too, and
  // an answer given while the request was in flight outranks the server's copy.
  if (hasLocalAnswers(target.calculatorId)) return;

  useAnswersStore.getState().adoptAnswers(target.calculatorId, fromWireAnswers(stored as Answer[]));

  // Adopting counts as a change, which arms a save. Record what the server
  // already holds so that save recognises it as a no-op and stays home.
  const state = states.get(target.calculatorId);
  if (state) state.savedBody = buildBody(target);
}

function ensureSession(target: CalculatorSyncTarget): SyncState {
  const existing = states.get(target.calculatorId);
  if (existing) return existing;

  const state: SyncState = { ready: Promise.resolve(false), lastSaveAt: 0 };
  states.set(target.calculatorId, state);
  state.ready = initialize(target).then((exists) => {
    state.sessionExists = exists;
    return exists;
  });
  return state;
}

async function save(target: CalculatorSyncTarget, matches?: Match[]): Promise<void> {
  const state = states.get(target.calculatorId);
  if (!state) return;

  const body = buildBody(target, matches);
  if (body === state.savedBody) return;

  if (!(await state.ready)) return;

  try {
    const response = await fetch(sessionDataUrl(target.calculatorId), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeaders() },
      body,
    });
    if (!response.ok) return;
  } catch {
    return;
  }

  state.savedBody = body;
  state.lastSaveAt = Date.now();
}

/**
 * Persist now, from a page that may be about to disappear.
 *
 * `sendBeacon` is the only request the browser promises to finish after
 * unload, and it cannot carry an Authorization header — so this is the cookie
 * path by construction. Where the cookie is blocked the throttled saves during
 * the flow, which do carry the Bearer, are what keep the server current; the
 * beacon there simply 401s and nothing is lost that was not already saved.
 *
 * Because the beacon's fate is unknowable, it is deduplicated against its own
 * record rather than against `savedBody`: a beacon that quietly failed must not
 * suppress the next real save of the same answers.
 */
function flush(target: CalculatorSyncTarget): void {
  const state = states.get(target.calculatorId);
  // Nothing to save into yet — the session POST has not come back, and a
  // beacon at a session that does not exist is a 404 nobody will ever read.
  if (!state?.sessionExists) return;

  const body = buildBody(target);
  if (body === state.savedBody || body === state.beaconedBody) return;

  if (typeof navigator.sendBeacon !== 'function') {
    void save(target);
    return;
  }

  navigator.sendBeacon(
    sessionDataUrl(target.calculatorId),
    new Blob([body], { type: 'application/json' }),
  );
  state.beaconedBody = body;
}

function scheduleSave(target: CalculatorSyncTarget): void {
  const state = states.get(target.calculatorId);
  if (!state || state.timer !== undefined) return;

  const wait = Math.max(0, SAVE_INTERVAL_MS - (Date.now() - state.lastSaveAt));
  state.timer = setTimeout(() => {
    state.timer = undefined;
    void save(target);
  }, wait);
}

/**
 * Start syncing one calculator; returns the teardown.
 *
 * A no-op — not even a closure over the target — when sync is unconfigured or
 * the calculator is not one the database can hold.
 */
export function startCalculatorSync(target: CalculatorSyncTarget): () => void {
  if (!canSync(target.calculatorId)) return () => {};

  ensureSession(target);

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flush(target);
  };
  const onPageHide = () => flush(target);

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide);

  const unsubscribe = useAnswersStore.subscribe((state, previous) => {
    if (state.byCalculator[target.calculatorId] === previous.byCalculator[target.calculatorId]) {
      return;
    }
    scheduleSave(target);
  });

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', onPageHide);
    unsubscribe();
    // A pending timer is deliberately left to fire: unmounting here means
    // moving between the calculator's own screens, and the answers it is about
    // to save are still exactly the ones the user wants kept.
  };
}

/**
 * Save the finished session, with the ranking that produced it.
 *
 * `matches` is what makes the server stamp `completedAt` and is what a shared
 * result is rendered from, so this is the one save the flow makes on purpose
 * rather than as a precaution. Candidates who answered nothing are still
 * listed, without a percentage — the same distinction the results screen draws.
 */
export async function saveResults(
  target: CalculatorSyncTarget,
  results: readonly CandidateResult[],
): Promise<void> {
  if (!canSync(target.calculatorId)) return;

  // The results screen can be the first calculator screen a shared link opens.
  ensureSession(target);

  const matches: Match[] = results
    .filter((result) => isUuid(result.candidate.id))
    .map(({ candidate, match }) => ({
      id: candidate.id,
      ...(match.matchPercentage === undefined ? {} : { match: Math.round(match.matchPercentage) }),
    }));

  await save(target, matches);
}

/**
 * Mint — or recover — the public id this session is shareable under.
 *
 * The odd one out in this module: every other call here is fire-and-forget
 * because it happens *while* someone answers questions, and a failed save is
 * not their problem. This one is a button press whose whole point is a URL, so
 * it reports failure (`null`) instead of swallowing it, and the dialog says so.
 *
 * The server is idempotent — a session that already has a public id gets the
 * same one back — so pressing twice cannot mint two links to one result.
 */
export async function requestShareLink(calculatorId: string): Promise<string | null> {
  if (!canSync(calculatorId)) return null;

  /*
   * The calculator screens open the session on mount; awaiting that here is
   * what stops a fast press from racing the POST that creates the very row
   * this endpoint looks up. No entry at all means sync never started for this
   * calculator, and there is nothing to wait for.
   */
  const state = states.get(calculatorId);
  if (state && !(await state.ready)) return null;

  try {
    const response = await fetch(`/api/calculators/${calculatorId}/sessions:share`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    const publicId = (body as { publicId?: unknown } | null)?.publicId;
    return typeof publicId === 'string' ? publicId : null;
  } catch {
    return null;
  }
}

/** Test seam: the per-document guards above outlive any single test. */
export function resetSyncStateForTests(): void {
  for (const state of states.values()) {
    if (state.timer !== undefined) clearTimeout(state.timer);
  }
  states.clear();
}
