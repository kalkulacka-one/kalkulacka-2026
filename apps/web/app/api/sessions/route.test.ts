import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const { dbMock, cookieJar } = vi.hoisted(() => ({
  dbMock: {
    calculatorSession: {
      create: vi.fn(),
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

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function getRequest(): NextRequest {
  return new NextRequest('http://localhost/api/sessions');
}

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
  vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', 'volebnikalkulacka');
  cookieJar.clear();
  dbMock.calculatorSession.create.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/sessions', () => {
  it('creates a brand new session with no existing cookie', async () => {
    dbMock.calculatorSession.create.mockResolvedValue({
      sessionId: '22222222-2222-4222-8222-222222222222',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const response = await POST(
      postRequest({
        calculatorId: '11111111-1111-4111-8111-111111111111',
        calculatorKey: 'kalkulacka',
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ sessionId: '22222222-2222-4222-8222-222222222222' });
    expect(dbMock.calculatorSession.create).toHaveBeenCalledTimes(1);
    expect(cookieJar.get('volebnikalkulacka')).toBeDefined();
  });

  it('reuses an existing cookie session and adds the new calculator', async () => {
    const existing = {
      id: '33333333-3333-4333-8333-333333333333',
      calculators: ['other-calc'],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    cookieJar.set('volebnikalkulacka', { value: JSON.stringify(existing) });
    dbMock.calculatorSession.create.mockResolvedValue({
      sessionId: existing.id,
      createdAt: new Date(existing.createdAt),
    });

    const response = await POST(
      postRequest({
        calculatorId: '11111111-1111-4111-8111-111111111111',
        calculatorKey: 'kalkulacka',
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ sessionId: existing.id });
    expect(dbMock.calculatorSession.create).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(cookieJar.get('volebnikalkulacka')?.value ?? '{}');
    expect(stored.calculators).toEqual(['other-calc', 'kalkulacka']);
  });

  it('does not touch the database when the cookie already lists the calculator', async () => {
    const existing = {
      id: '33333333-3333-4333-8333-333333333333',
      calculators: ['kalkulacka'],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    cookieJar.set('volebnikalkulacka', { value: JSON.stringify(existing) });

    const response = await POST(
      postRequest({
        calculatorId: '11111111-1111-4111-8111-111111111111',
        calculatorKey: 'kalkulacka',
      }),
    );

    expect(response.status).toBe(200);
    expect(dbMock.calculatorSession.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid body', async () => {
    const response = await POST(postRequest({ calculatorKey: 'kalkulacka' }));
    expect(response.status).toBe(400);
  });

  it('sets the suffixed cookie for a registered embed partner', async () => {
    dbMock.calculatorSession.create.mockResolvedValue({
      sessionId: '22222222-2222-4222-8222-222222222222',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const response = await POST(
      postRequest({
        calculatorId: '11111111-1111-4111-8111-111111111111',
        calculatorKey: 'kalkulacka',
        embedName: 'idnes',
      }),
    );

    expect(response.status).toBe(200);
    expect(cookieJar.get('volebnikalkulacka_embed_idnes')).toBeDefined();
    expect(cookieJar.get('volebnikalkulacka')).toBeUndefined();
  });

  it('rejects an embed name the partner registry does not know (S7)', async () => {
    // The name would become a cookie-name suffix and a session attribute;
    // registry membership is the validation, same as the Referer path.
    const response = await POST(
      postRequest({
        calculatorId: '11111111-1111-4111-8111-111111111111',
        calculatorKey: 'kalkulacka',
        embedName: 'not\r\na-partner',
      }),
    );

    expect(response.status).toBe(400);
    expect(dbMock.calculatorSession.create).not.toHaveBeenCalled();
  });

  it('returns 503 when sessions are not configured', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const response = await POST(
      postRequest({
        calculatorId: '11111111-1111-4111-8111-111111111111',
        calculatorKey: 'kalkulacka',
      }),
    );
    expect(response.status).toBe(503);
  });
});

describe('GET /api/sessions', () => {
  it('returns 401 with no session', async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it('returns 204 with a session cookie', async () => {
    cookieJar.set('volebnikalkulacka', {
      value: JSON.stringify({ id: '33333333-3333-4333-8333-333333333333', calculators: [] }),
    });
    const response = await GET(getRequest());
    expect(response.status).toBe(204);
  });

  it('returns 503 when sessions are not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', '');
    const response = await GET(getRequest());
    expect(response.status).toBe(503);
  });
});
