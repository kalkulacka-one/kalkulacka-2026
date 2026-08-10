import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const { dbMock, cookieJar } = vi.hoisted(() => ({
  dbMock: {
    calculatorSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
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

function withSessionCookie() {
  cookieJar.set('volebnikalkulacka', { value: JSON.stringify({ id: sessionId, calculators: [] }) });
}

function postRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/calculators/${id}/sessions:share`, {
    method: 'POST',
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ 'calculator-id': id }) };
}

const fetchMock = vi.fn(async (_input: URL | RequestInfo) => new Response(null, { status: 200 }));

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
  vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', 'volebnikalkulacka');
  vi.stubGlobal('fetch', fetchMock);
  cookieJar.clear();
  dbMock.calculatorSession.findUnique.mockReset();
  dbMock.calculatorSession.update.mockReset();
  fetchMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST sessions:share', () => {
  it('assigns a public id and warms the OG image via the configured base URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.com');
    withSessionCookie();
    dbMock.calculatorSession.findUnique.mockResolvedValue({ id: 'row-id', publicId: null });

    const response = await POST(postRequest(calculatorId), routeParams(calculatorId));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.publicId).toMatch(/^[0-9a-f-]{36}$/);
    expect(dbMock.calculatorSession.update).toHaveBeenCalledTimes(1);

    // The warm-up must aim at the configured origin, never at whatever the
    // request's Host header claimed (blind SSRF otherwise).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const warmupUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(warmupUrl).toBe(`https://example.com/api/images/sessions/${body.publicId}/opengraph`);
  });

  it('skips the warm-up entirely when no base URL is configured', async () => {
    withSessionCookie();
    dbMock.calculatorSession.findUnique.mockResolvedValue({ id: 'row-id', publicId: null });

    const response = await POST(postRequest(calculatorId), routeParams(calculatorId));

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the existing public id without a second warm-up', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.com');
    withSessionCookie();
    const publicId = '44444444-4444-4444-8444-444444444444';
    dbMock.calculatorSession.findUnique.mockResolvedValue({ id: 'row-id', publicId });

    const response = await POST(postRequest(calculatorId), routeParams(calculatorId));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ publicId });
    expect(dbMock.calculatorSession.update).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 404 for a non-UUID calculator id without touching the database', async () => {
    withSessionCookie();
    const response = await POST(postRequest('not-a-uuid'), routeParams('not-a-uuid'));
    expect(response.status).toBe(404);
    expect(dbMock.calculatorSession.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 with no session', async () => {
    const response = await POST(postRequest(calculatorId), routeParams(calculatorId));
    expect(response.status).toBe(401);
  });

  it('returns 503 when sessions are not configured', async () => {
    vi.stubEnv('DATABASE_URL', '');
    withSessionCookie();
    const response = await POST(postRequest(calculatorId), routeParams(calculatorId));
    expect(response.status).toBe(503);
  });
});
