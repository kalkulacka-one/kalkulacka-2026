import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { getSessionFromRequest } from './get-session-from-request';

function requestWithAuth(authorization?: string): NextRequest {
  return new NextRequest('http://localhost/api/sessions', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('getSessionFromRequest', () => {
  it('extracts the token from a Bearer header', () => {
    expect(getSessionFromRequest(requestWithAuth('Bearer abc-123'))).toBe('abc-123');
  });

  it('is case-insensitive on the scheme', () => {
    expect(getSessionFromRequest(requestWithAuth('bearer abc-123'))).toBe('abc-123');
  });

  it('trims surrounding whitespace on the token', () => {
    expect(getSessionFromRequest(requestWithAuth('Bearer   abc-123  '))).toBe('abc-123');
  });

  it('returns null with no authorization header', () => {
    expect(getSessionFromRequest(requestWithAuth())).toBeNull();
  });

  it('returns null for a non-Bearer scheme', () => {
    expect(getSessionFromRequest(requestWithAuth('Basic abc-123'))).toBeNull();
  });

  it('returns null for an empty Bearer token', () => {
    expect(getSessionFromRequest(requestWithAuth('Bearer '))).toBeNull();
  });
});
