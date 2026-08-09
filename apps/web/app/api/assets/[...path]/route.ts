import { getSiteDataConfig } from '@/config/site';
import {
  BadGatewayError,
  GatewayTimeoutError,
  HttpError,
  NotFoundError,
} from '@/lib/api/http-errors';

/**
 * A same-origin mirror of one asset on the data CDN.
 *
 * Exists only for the share-card export: `html-to-image` rasterises the card
 * by re-fetching every `<img>`'s pixels itself, and the CDN sends no
 * `Access-Control-Allow-Origin` — so that fetch is blocked even though the
 * `<img>` displays fine. Routing the same bytes through this origin sidesteps
 * CORS without asking the CDN for anything. Nothing else in the app should
 * point here: every other avatar keeps loading the CDN directly, which is
 * strictly less latency for a picture that was never going onto a canvas.
 */

const UPSTREAM_TIMEOUT_MS = 10_000;

/**
 * Resolve `path` against the configured data endpoint, or refuse.
 *
 * The segments Next hands us are already URL-decoded, so an encoded slash or
 * an encoded `..` does not arrive as its own segment — it arrives as a literal
 * `/` or `.` *inside* one, which is exactly how `/api/assets/https%3A%2F%2Fevil.example`
 * tries to smuggle a whole foreign URL in as "one path segment". Rejecting any
 * segment that carries a slash, a backslash, or is bare `.`/`..` closes that.
 * Resolving what's left with `URL` against the endpoint and then checking the
 * resolved origin and pathname prefix closes the rest — including anything
 * `URL` itself would collapse upward, and an endpoint typo that resolves
 * outside itself.
 */
function resolveAssetUrl(endpoint: string, segments: string[]): URL | null {
  if (segments.length === 0) return null;

  for (const segment of segments) {
    if (!segment) return null;
    if (segment.includes('/') || segment.includes('\\')) return null;
    if (segment === '.' || segment === '..') return null;
  }

  const base = new URL(`${endpoint}/`);
  let target: URL;
  try {
    target = new URL(segments.join('/'), base);
  } catch {
    return null;
  }

  if (target.origin !== base.origin) return null;
  if (!target.pathname.startsWith(base.pathname)) return null;

  return target;
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const config = getSiteDataConfig();
    if (!config) {
      return new NotFoundError('No data endpoint configured').toResponse();
    }

    const { path } = await params;
    const target = resolveAssetUrl(config.endpoint, path ?? []);
    if (!target) {
      return new NotFoundError('Not found').toResponse();
    }

    let upstream: Response;
    try {
      upstream = await fetch(target, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        return new GatewayTimeoutError().toResponse();
      }
      return new BadGatewayError().toResponse();
    }

    if (!upstream.ok || !upstream.body) {
      return new BadGatewayError(`Upstream returned ${upstream.status}`).toResponse();
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        // Versioned static assets — the CDN path changes when the image does.
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return error.toResponse();
    }

    throw error;
  }
}
