import { describe, expect, it } from 'vitest';
import { toProxiedAssetUrl } from './share-asset-url';

const ASSET_BASE = 'https://data.kalkulacka.one/www.volebnikalkulacka.cz/snemovni-2025/kalkulacka';
const CALCULATOR = {
  assetBase: ASSET_BASE,
  electionId: 'snemovni-2025',
  districtCode: 'kalkulacka',
};

describe('toProxiedAssetUrl', () => {
  it('rewrites a URL under the calculator’s own asset base to the proxy', () => {
    expect(toProxiedAssetUrl(`${ASSET_BASE}/images/abc/avatar.webp`, CALCULATOR)).toBe(
      '/api/assets/snemovni-2025/kalkulacka/images/abc/avatar.webp',
    );
  });

  it('keeps the group/key segments the proxy resolves against the endpoint', () => {
    // The proxy prepends DATA_ENDPOINT only; a rewrite that dropped the
    // calculator segments would point at the endpoint root and 502.
    const proxied = toProxiedAssetUrl(`${ASSET_BASE}/images/a.webp`, CALCULATOR);
    expect(proxied).toMatch(/^\/api\/assets\/snemovni-2025\/kalkulacka\//);
  });

  it('leaves a URL from a different host untouched', () => {
    const foreign = 'https://archiv.volebnikalkulacka.cz/img/abc.jpg';
    expect(toProxiedAssetUrl(foreign, CALCULATOR)).toBe(foreign);
  });

  it('leaves the URL untouched when there is no asset base (fixtures)', () => {
    const url = 'https://archiv.volebnikalkulacka.cz/img/abc.jpg';
    expect(toProxiedAssetUrl(url, { ...CALCULATOR, assetBase: undefined })).toBe(url);
  });

  it('passes undefined through unchanged', () => {
    expect(toProxiedAssetUrl(undefined, CALCULATOR)).toBeUndefined();
  });

  it('is a no-op when the asset base itself is the whole URL', () => {
    expect(toProxiedAssetUrl(ASSET_BASE, CALCULATOR)).toBe(ASSET_BASE);
  });
});
