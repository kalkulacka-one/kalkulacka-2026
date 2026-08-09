// @vitest-environment jsdom

import type { CandidateResult } from '@vk/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnswersStore } from '../answers-store';
import type { CalculatorSyncTarget } from './session-sync';
import { resetSyncStateForTests, saveResults, startCalculatorSync } from './session-sync';

/*
 * Node 26 declares a `localStorage` global of its own that resolves to
 * `undefined` unless the process was started with `--localstorage-file`, and it
 * shadows jsdom's. Zustand's persist middleware captures the storage the moment
 * the store module is evaluated, so the substitute has to be in place before
 * the imports above run — hence `vi.hoisted`. Only the four methods persist
 * touches.
 */
vi.hoisted(() => {
  if (typeof (globalThis as { localStorage?: Storage }).localStorage?.setItem === 'function') {
    return;
  }

  const entries = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      removeItem: (key: string) => void entries.delete(key),
      clear: () => entries.clear(),
    },
  });
});

const CALCULATOR_ID = '75c4b804-ed05-4029-b561-5255ec97848c';
const CANDIDATE_ID = '66666666-6666-4666-8666-666666666666';
const QUESTION_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_QUESTION_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = '99999999-9999-4999-8999-999999999999';

const SESSION_DATA_URL = `/api/calculators/${CALCULATOR_ID}/session-data`;

const target: CalculatorSyncTarget = {
  calculatorId: CALCULATOR_ID,
  calculatorGroup: 'snemovni-2025',
  calculatorKey: 'kalkulacka',
  calculatorVersion: '2.0.1',
};

const fetchMock = vi.fn();
const sendBeacon = vi.fn(() => true);

/** Only `.ok` and `.json()` are ever read, so this is the whole of a response. */
function reply(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** The happy backend: a session exists, and `storedAnswers` is what it holds. */
function backend(storedAnswers?: unknown[]) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === '/api/sessions') return reply(200, { sessionId: SESSION_ID });
    if (init?.method === 'POST') return reply(204);
    if (!storedAnswers) return reply(404);
    return reply(200, { answers: storedAnswers });
  });
}

function callsTo(url: string, method?: string) {
  return fetchMock.mock.calls.filter(
    ([called, init]) => called === url && (method === undefined || init?.method === method),
  );
}

function lastBody(url: string): unknown {
  const calls = callsTo(url, 'POST');
  return JSON.parse(String(calls[calls.length - 1]?.[1]?.body));
}

function answersOf(calculatorId: string) {
  return useAnswersStore.getState().byCalculator[calculatorId] ?? {};
}

/** Let the init POST, the restore GET, a zero-delay save and their `.then`s all run. */
async function settle() {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', 'volebnikalkulacka');
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('navigator', Object.assign(window.navigator, { sendBeacon }));
  fetchMock.mockReset();
  sendBeacon.mockClear();
  backend();
  resetSyncStateForTests();
  useAnswersStore.setState({ byCalculator: {} });
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('graceful degradation', () => {
  it('makes no network call at all when no session cookie name is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', '');

    const stop = startCalculatorSync(target);
    useAnswersStore.getState().setAnswer(CALCULATOR_ID, QUESTION_ID, true);
    window.dispatchEvent(new Event('pagehide'));
    await saveResults(target, []);
    await settle();
    stop();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('leaves a fixture calculator on localStorage alone — its id is not a UUID', async () => {
    const fixture = { ...target, calculatorId: 'komunalni-2022-555134' };

    const stop = startCalculatorSync(fixture);
    useAnswersStore.getState().setAnswer(fixture.calculatorId, QUESTION_ID, true);
    await settle();
    stop();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not throw or lose local answers when the backend is down', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const stop = startCalculatorSync(target);
    useAnswersStore.getState().setAnswer(CALCULATOR_ID, QUESTION_ID, true);
    await settle();
    stop();

    expect(answersOf(CALCULATOR_ID)[QUESTION_ID]?.answer).toBe(true);
  });
});

describe('session init and restore', () => {
  it('opens the session with the calculator identity the database keys on', async () => {
    startCalculatorSync(target);
    await settle();

    expect(JSON.parse(String(callsTo('/api/sessions', 'POST')[0]?.[1]?.body))).toEqual({
      calculatorId: CALCULATOR_ID,
      calculatorKey: 'kalkulacka',
      calculatorGroup: 'snemovni-2025',
      calculatorVersion: '2.0.1',
    });
  });

  it('adopts the stored answers when this device has none', async () => {
    backend([
      { questionId: QUESTION_ID, answer: true, isImportant: true },
      { questionId: OTHER_QUESTION_ID, answer: null },
    ]);

    startCalculatorSync(target);
    await settle();

    expect(answersOf(CALCULATOR_ID)[QUESTION_ID]).toEqual({
      questionId: QUESTION_ID,
      answer: true,
      isImportant: true,
      skipped: false,
    });
    expect(answersOf(CALCULATOR_ID)[OTHER_QUESTION_ID]?.skipped).toBe(true);
  });

  it('does not re-post what it just adopted', async () => {
    backend([{ questionId: QUESTION_ID, answer: true }]);

    startCalculatorSync(target);
    await settle();
    window.dispatchEvent(new Event('pagehide'));

    expect(callsTo(SESSION_DATA_URL, 'POST')).toHaveLength(0);
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('lets the answers on this device win, without even asking the server', async () => {
    backend([{ questionId: OTHER_QUESTION_ID, answer: false }]);
    useAnswersStore.getState().setAnswer(CALCULATOR_ID, QUESTION_ID, true);

    startCalculatorSync(target);
    await settle();

    expect(callsTo(SESSION_DATA_URL, undefined)).toHaveLength(0);
    expect(answersOf(CALCULATOR_ID)[OTHER_QUESTION_ID]).toBeUndefined();
  });

  it('keeps saving when the restore itself fails — the session still exists', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/api/sessions') return reply(200, { sessionId: SESSION_ID });
      if (init?.method === 'POST') return reply(204);
      throw new Error('offline');
    });

    startCalculatorSync(target);
    await settle();
    useAnswersStore.getState().setAnswer(CALCULATOR_ID, QUESTION_ID, true);
    await settle();

    expect(callsTo(SESSION_DATA_URL, 'POST')).toHaveLength(1);
  });

  it('restores once per document, so "Začít znovu" is not undone by the next screen', async () => {
    backend([{ questionId: QUESTION_ID, answer: true }]);

    const stop = startCalculatorSync(target);
    await settle();
    expect(answersOf(CALCULATOR_ID)[QUESTION_ID]).toBeDefined();
    stop();

    useAnswersStore.getState().resetCalculator(CALCULATOR_ID);
    startCalculatorSync(target);
    await settle();

    expect(answersOf(CALCULATOR_ID)).toEqual({});
    expect(callsTo('/api/sessions', 'POST')).toHaveLength(1);
  });
});

describe('autosave', () => {
  it('beacons the answers when the tab is hidden', async () => {
    startCalculatorSync(target);
    await settle();
    useAnswersStore.getState().skipQuestion(CALCULATOR_ID, QUESTION_ID);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(sendBeacon).toHaveBeenCalledWith(SESSION_DATA_URL, expect.any(Blob));
  });

  it('does not beacon before the session it would save into exists', async () => {
    startCalculatorSync(target);
    useAnswersStore.getState().setAnswer(CALCULATOR_ID, QUESTION_ID, true);
    window.dispatchEvent(new Event('pagehide'));

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('saves early, then at most once per throttle window while answering', async () => {
    vi.useFakeTimers();
    startCalculatorSync(target);
    await vi.advanceTimersByTimeAsync(0);

    useAnswersStore.getState().setAnswer(CALCULATOR_ID, QUESTION_ID, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(callsTo(SESSION_DATA_URL, 'POST')).toHaveLength(1);

    useAnswersStore.getState().setAnswer(CALCULATOR_ID, OTHER_QUESTION_ID, false);
    useAnswersStore.getState().toggleImportant(CALCULATOR_ID, OTHER_QUESTION_ID);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(callsTo(SESSION_DATA_URL, 'POST')).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(callsTo(SESSION_DATA_URL, 'POST')).toHaveLength(2);
    expect(lastBody(SESSION_DATA_URL)).toEqual({
      answers: [
        { questionId: QUESTION_ID, answer: true },
        { questionId: OTHER_QUESTION_ID, answer: false, isImportant: true },
      ],
      calculatorVersion: '2.0.1',
    });
  });
});

describe('results', () => {
  const results = [
    { candidate: { id: CANDIDATE_ID }, match: { matchPercentage: 66.667 }, rank: 1 },
    { candidate: { id: 'not-a-uuid' }, match: { matchPercentage: 10 }, rank: 2 },
    { candidate: { id: SESSION_ID }, match: { matchPercentage: undefined }, rank: undefined },
  ] as unknown as CandidateResult[];

  it('saves rounded matches, which is what marks the session complete', async () => {
    startCalculatorSync(target);
    await settle();
    useAnswersStore.getState().setAnswer(CALCULATOR_ID, QUESTION_ID, true);

    await saveResults(target, results);

    expect(lastBody(SESSION_DATA_URL)).toEqual({
      answers: [{ questionId: QUESTION_ID, answer: true }],
      // A candidate who never answered is still ranked-in, without a score —
      // the same distinction the results screen draws.
      matches: [{ id: CANDIDATE_ID, match: 67 }, { id: SESSION_ID }],
      calculatorVersion: '2.0.1',
    });
  });
});
