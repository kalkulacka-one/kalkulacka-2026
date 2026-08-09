import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const { dbMock, cookieJar } = vi.hoisted(() => ({
  dbMock: {
    calculatorSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    calculatorSessionData: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      await fn(dbMock);
    }),
  },
  cookieJar: new Map<string, { value: string }>(),
}));

vi.mock('@vk/database', () => ({ db: () => dbMock }));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => cookieJar.set(name, { value }),
  })),
}));

const calculatorId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const questionId = '33333333-3333-4333-8333-333333333333';

function withSessionCookie() {
  cookieJar.set('volebnikalkulacka', { value: JSON.stringify({ id: sessionId, calculators: [] }) });
}

function getRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/calculators/${calculatorId}/session-data`);
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/calculators/${calculatorId}/session-data`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const routeParams = { params: Promise.resolve({ 'calculator-id': calculatorId }) };

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
  vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', 'volebnikalkulacka');
  cookieJar.clear();
  dbMock.calculatorSession.findUnique.mockReset();
  dbMock.calculatorSession.update.mockReset();
  dbMock.calculatorSessionData.upsert.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET session-data', () => {
  it('returns the stored answers for the session', async () => {
    withSessionCookie();
    dbMock.calculatorSession.findUnique.mockResolvedValue({
      id: 'row-id',
      calculatorVersion: '1.0.0',
      data: {
        answers: [{ questionId, answer: true }],
        result: [{ id: questionId, match: 50 }],
      },
    });

    const response = await GET(getRequest(), routeParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      answers: [{ questionId, answer: true }],
      matches: [{ id: questionId, match: 50 }],
      calculatorVersion: '1.0.0',
    });
  });

  it('returns 401 with no session', async () => {
    const response = await GET(getRequest(), routeParams);
    expect(response.status).toBe(401);
  });

  it('returns 503 when sessions are not configured', async () => {
    vi.stubEnv('DATABASE_URL', '');
    withSessionCookie();
    const response = await GET(getRequest(), routeParams);
    expect(response.status).toBe(503);
    expect(dbMock.calculatorSession.findUnique).not.toHaveBeenCalled();
  });
});

describe('POST session-data', () => {
  it('stores answers for an existing session', async () => {
    withSessionCookie();
    dbMock.calculatorSession.findUnique.mockResolvedValue({
      id: 'row-id',
      calculatorVersion: null,
    });

    const response = await POST(
      postRequest({ answers: [{ questionId, answer: true }] }),
      routeParams,
    );

    expect(response.status).toBe(204);
    expect(dbMock.calculatorSessionData.upsert).toHaveBeenCalledTimes(1);
  });

  it('returns 401 with no session', async () => {
    const response = await POST(postRequest({ answers: [] }), routeParams);
    expect(response.status).toBe(401);
    expect(dbMock.calculatorSessionData.upsert).not.toHaveBeenCalled();
  });

  it('returns 503 when sessions are not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', '');
    withSessionCookie();
    const response = await POST(postRequest({ answers: [] }), routeParams);
    expect(response.status).toBe(503);
    expect(dbMock.calculatorSessionData.upsert).not.toHaveBeenCalled();
  });
});
