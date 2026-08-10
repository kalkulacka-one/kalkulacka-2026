import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    calculatorSession: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@vk/database', () => ({ db: () => dbMock }));

const publicId = '44444444-4444-4444-8444-444444444444';
const calculatorId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';

function getRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/session/${id}`);
}

function routeParams(id: string) {
  return { params: Promise.resolve({ 'public-id': id }) };
}

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
  vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', 'volebnikalkulacka');
  dbMock.calculatorSession.findUnique.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/session/[public-id]', () => {
  it('returns the shared session', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue({
      publicId,
      calculatorId,
      calculatorKey: 'kalkulacka',
      calculatorGroup: 'snemovni-2025',
      calculatorVersion: '1.0.0',
      data: { answers: [], result: [] },
    });

    const response = await GET(getRequest(publicId), routeParams(publicId));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.publicId).toBe(publicId);
    expect(body.calculatorId).toBe(calculatorId);
  });

  it('returns 404 for a non-UUID public id without touching the database', async () => {
    // A typo'd share link used to reach Prisma, which throws on non-UUID
    // values for `@db.Uuid` columns — a 500 instead of a 404.
    const response = await GET(getRequest('not-a-uuid'), routeParams('not-a-uuid'));

    expect(response.status).toBe(404);
    expect(dbMock.calculatorSession.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown public id', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue(null);
    const response = await GET(getRequest(sessionId), routeParams(sessionId));
    expect(response.status).toBe(404);
  });

  it('returns 404 when the session has no data', async () => {
    dbMock.calculatorSession.findUnique.mockResolvedValue({ publicId, data: null });
    const response = await GET(getRequest(publicId), routeParams(publicId));
    expect(response.status).toBe(404);
  });

  it('returns 503 when sessions are not configured', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const response = await GET(getRequest(publicId), routeParams(publicId));
    expect(response.status).toBe(503);
    expect(dbMock.calculatorSession.findUnique).not.toHaveBeenCalled();
  });
});
