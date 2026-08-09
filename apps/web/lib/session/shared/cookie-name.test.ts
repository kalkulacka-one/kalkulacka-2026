import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCookieName } from './cookie-name';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildCookieName', () => {
  it('returns the base name with no embed', () => {
    vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', 'volebnikalkulacka');
    expect(buildCookieName()).toBe('volebnikalkulacka');
  });

  it('suffixes the embed name', () => {
    vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', 'volebnikalkulacka');
    expect(buildCookieName({ embedName: 'idnes' })).toBe('volebnikalkulacka_embed_idnes');
  });

  it('throws when the base env var is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SESSION_COOKIE_NAME', '');
    expect(() => buildCookieName()).toThrow(/NEXT_PUBLIC_SESSION_COOKIE_NAME/);
  });
});
