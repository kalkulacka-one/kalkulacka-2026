import { afterEach, describe, expect, it, vi } from 'vitest';
import sitemap from './sitemap';

describe('sitemap on fixtures', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists the home page, every election, and every available calculator intro', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain('/');
    expect(urls).toContain('/volby/komunalni-2022');
    expect(urls).toContain('/volby/komunalni-2022/pardubice/uvod');
    // A district we hold no data for is not a landing page.
    expect(urls.some((url) => url.includes('brno'))).toBe(false);
  });

  it('qualifies every URL with NEXT_PUBLIC_BASE_URL when it is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.cz');
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain('https://example.cz/');
    expect(urls.every((url) => url.startsWith('https://example.cz'))).toBe(true);
  });
});
