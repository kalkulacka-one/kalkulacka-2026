import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';

describe('robots', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('disallows only /api/ and omits the sitemap when no base URL is configured', () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: '*', allow: '/', disallow: '/api/' });
    expect(result.sitemap).toBeUndefined();
  });

  it('points to an absolute sitemap URL once NEXT_PUBLIC_BASE_URL is set', () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.cz');
    expect(robots().sitemap).toBe('https://example.cz/sitemap.xml');
  });
});
