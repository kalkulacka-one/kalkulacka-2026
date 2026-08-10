import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { getSessionFromRequest } from './get-session-from-request';

const sessionId = '22222222-2222-4222-8222-222222222222';

function requestWithAuth(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/sessions', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('getSessionFromRequest', () => {
  it('extracts the token from a Bearer header', () => {
    expect(getSessionFromRequest(requestWithAuth(`Bearer ${sessionId}`))).toBe(sessionId);
  });

  it('is case-insensitive on the scheme', () => {
    expect(getSessionFromRequest(requestWithAuth(`bearer ${sessionId}`))).toBe(sessionId);
  });

  it('trims surrounding whitespace on the token', () => {
    expect(getSessionFromRequest(requestWithAuth(`Bearer   ${sessionId}  `))).toBe(sessionId);
  });

  it('returns null with no authorization header', () => {
    expect(getSessionFromRequest(requestWithAuth())).toBeNull();
  });

  it('returns null for a non-Bearer scheme', () => {
    expect(getSessionFromRequest(requestWithAuth(`Basic ${sessionId}`))).toBeNull();
  });

  it('returns null for an empty Bearer token', () => {
    expect(getSessionFromRequest(requestWithAuth('Bearer '))).toBeNull();
  });

  it('returns null for a non-UUID token — it would 500 in Prisma, not 401', () => {
    expect(getSessionFromRequest(requestWithAuth('Bearer abc-123'))).toBeNull();
    expect(getSessionFromRequest(requestWithAuth("Bearer '; DROP TABLE sessions; --"))).toBeNull();
  });
});
