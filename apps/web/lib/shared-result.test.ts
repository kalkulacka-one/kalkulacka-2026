import { buildResults, type Calculator } from '@vk/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSharedResult } from './shared-result';

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    calculatorSession: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@vk/database', () => ({ db: () => dbMock }));

const CALCULATOR_ID = '11111111-1111-4111-8111-111111111111';
const PUBLIC_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const Q1 = '11111111-1111-4111-8111-000000000001';
const Q2 = '22222222-2222-4222-8222-000000000002';
const Q3 = '33333333-3333-4333-8333-000000000003';

/** Answers exactly as the production column holds them, wire shape and all. */
const STORED_ANSWERS = [
  { questionId: Q1, answer: true },
  { questionId: Q2, answer: true, isImportant: true },
  // An explicit skip — `null` on the wire, and excluded from the match.
  { questionId: Q3, answer: null },
];

function session(overrides: Record<string, unknown> = {}) {
  return {
    publicId: PUBLIC_ID,
    calculatorId: CALCULATOR_ID,
    calculatorGroup: 'snemovni-2025',
    calculatorKey: 'kalkulacka',
    data: { answers: STORED_ANSWERS },
    ...overrides,
  };
}

function candidate(id: string, name: string) {
  return {
    id,
    name,
    shortName: name,
    type: 'party' as const,
    members: [],
    contacts: { web: [] },
  };
}

/** Three questions, three candidates: one agrees throughout, one opposes, one never filed. */
const calculator: Calculator = {
  id: CALCULATOR_ID,
  electionId: 'snemovni-2025',
  electionName: 'Sněmovní volby 2025',
  districtCode: 'kalkulacka',
  name: 'Volební kalkulačka',
  questions: [Q1, Q2, Q3].map((id) => ({ id, title: id, statement: id, tags: [] })),
  candidates: [candidate('a', 'Souhlasná'), candidate('b', 'Opačná'), candidate('c', 'Mlčící')],
  candidateAnswers: {
    a: [
      { questionId: Q1, answer: true },
      { questionId: Q2, answer: true },
      { questionId: Q3, answer: true },
    ],
    b: [
      { questionId: Q1, answer: false },
      { questionId: Q2, answer: false },
      { questionId: Q3, answer: false },
    ],
  },
};

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
  vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', 'volebnikalkulacka');
  dbMock.calculatorSession.findUnique.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadSharedResult guards', () => {
  it('returns null with no backend configured, without querying', async () => {
    vi.stubEnv('DATABASE_URL', '');

    expect(await loadSharedResult(PUBLIC_ID, CALCULATOR_ID)).toBeNull();
    expect(dbMock.calculatorSession.findUnique).not.toHaveBeenCalled();
  });

  it('returns null for a public id that is not a uuid, without querying', async () => {
    // The column is `@db.Uuid`; prisma throws on anything else rather than
    // returning no rows, so this has to be caught before the query.
    expect(await loadSharedResult('not-a-uuid', CALCULATOR_ID)).toBeNull();
    expect(dbMock.calculatorSession.findUnique).not.toHaveBeenCalled();
  });

  it('returns null for an unknown public id', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue(null);

    expect(await loadSharedResult(PUBLIC_ID, CALCULATOR_ID)).toBeNull();
  });

  it('returns null for a session that was never saved', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue(session({ data: null }));

    expect(await loadSharedResult(PUBLIC_ID, CALCULATOR_ID)).toBeNull();
  });

  it('returns null when the session belongs to a different calculator', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue(session());

    expect(await loadSharedResult(PUBLIC_ID, '99999999-9999-4999-8999-999999999999')).toBeNull();
  });

  it('returns null when the stored answers no longer fit the schema', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue(
      session({ data: { answers: [{ questionId: 'not-a-uuid', answer: true }] } }),
    );

    expect(await loadSharedResult(PUBLIC_ID, CALCULATOR_ID)).toBeNull();
  });

  it('skips the cross-check when no calculator is named', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue(session());

    const shared = await loadSharedResult(PUBLIC_ID);

    expect(shared?.calculatorId).toBe(CALCULATOR_ID);
    expect(shared?.calculatorGroup).toBe('snemovni-2025');
    expect(shared?.calculatorKey).toBe('kalkulacka');
  });
});

describe('stored answers, recomputed', () => {
  it('reads the wire format back into the shape the screens hold', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue(session());

    const shared = await loadSharedResult(PUBLIC_ID, CALCULATOR_ID);

    expect(shared?.answers).toEqual({
      [Q1]: { questionId: Q1, answer: true, isImportant: false, skipped: false },
      [Q2]: { questionId: Q2, answer: true, isImportant: true, skipped: false },
      [Q3]: { questionId: Q3, answer: undefined, isImportant: false, skipped: true },
    });
  });

  it('ranks the same way the results screen would', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue(session());

    const shared = await loadSharedResult(PUBLIC_ID, CALCULATOR_ID);
    // biome-ignore lint/style/noNonNullAssertion: guarded by the assertions above
    const results = buildResults(calculator, shared!.answers);

    expect(results.map((result) => result.candidate.id)).toEqual(['a', 'b', 'c']);
    expect(results[0]?.match.matchPercentage).toBe(100);
    expect(results[1]?.match.matchPercentage).toBe(0);
    // Never filed an answer: no percentage, and so no rank either.
    expect(results[2]?.match.matchPercentage).toBeUndefined();
    expect(results[2]?.rank).toBeUndefined();
    // The skipped question is excluded from both comparisons; the important
    // one is weighted twice, which is what makes the weight three, not two.
    expect(results[0]?.match.weight).toBe(3);
    expect(results[0]?.match.comparedCount).toBe(2);
  });
});
