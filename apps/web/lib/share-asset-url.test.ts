import { describe, expect, it } from 'vitest';
import { toProxiedAssetUrl } from './share-asset-url';

const ASSET_BASE = 'https://data.kalkulacka.one/www.volebnikalkulacka.cz/snemovni-2025/kalkulacka';

describe('toProxiedAssetUrl', () => {
  it('rewrites a URL under the calculator’s own asset base to the proxy', () => {
    expect(toProxiedAssetUrl(`${ASSET_BASE}/images/abc/avatar.webp`, ASSET_BASE)).toBe(
      '/api/assets/images/abc/avatar.webp',
    );
  });

  it('leaves a URL from a different host untouched', () => {
    const foreign = 'https://archiv.volebnikalkulacka.cz/img/abc.jpg';
    expect(toProxiedAssetUrl(foreign, ASSET_BASE)).toBe(foreign);
  });

  it('leaves the URL untouched when there is no asset base (fixtures)', () => {
    const url = 'https://archiv.volebnikalkulacka.cz/img/abc.jpg';
    expect(toProxiedAssetUrl(url, undefined)).toBe(url);
  });

  it('passes undefined through unchanged', () => {
    expect(toProxiedAssetUrl(undefined, ASSET_BASE)).toBeUndefined();
  });

  it('is a no-op when the asset base itself is the whole URL', () => {
    expect(toProxiedAssetUrl(ASSET_BASE, ASSET_BASE)).toBe(ASSET_BASE);
  });
});
