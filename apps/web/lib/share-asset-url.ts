const PROXY_PREFIX = '/api/assets/';

/**
 * Rewrite one of a calculator's own asset URLs to the same-origin proxy, for
 * the share-card export only (`app/api/assets/[...path]/route.ts`).
 *
 * `html-to-image` re-fetches every `<img>`'s pixels itself to paint the
 * canvas, and the data CDN sends no `Access-Control-Allow-Origin` — so that
 * fetch is blocked even though the `<img>` displays fine everywhere else.
 * `assetBase` is what tells "one of this calculator's own images" apart from
 * any other absolute URL a candidate's data could carry: only a URL that
 * actually starts with it is rewritten. Anything else — an archive fixture's
 * avatar, resolved against a different host entirely, or no `assetBase` at
 * all when running on fixtures — is left as-is rather than routed through a
 * proxy that would just reject it.
 *
 * The proxy resolves its path against `DATA_ENDPOINT`, while `assetBase` is
 * the *calculator's* base — endpoint plus `{group}/{key}` (see
 * `loadPlatformCalculator`, which also sets `electionId`/`districtCode` to
 * exactly those two segments). Those segments must therefore be put back in
 * front of the remainder, or the proxied path points at the endpoint root.
 */
export function toProxiedAssetUrl(
  url: string | undefined,
  calculator: { assetBase?: string; electionId: string; districtCode: string },
): string | undefined {
  const { assetBase, electionId, districtCode } = calculator;
  if (!url || !assetBase || !url.startsWith(assetBase)) return url;

  const rest = url.slice(assetBase.length).replace(/^\/+/, '');
  return rest ? `${PROXY_PREFIX}${electionId}/${districtCode}/${rest}` : url;
}
