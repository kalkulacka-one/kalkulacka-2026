import { networkInterfaces } from 'node:os';
import type { NextConfig } from 'next';

/**
 * Every LAN address this machine currently answers on.
 *
 * `next dev` serves the page HTML to any origin but returns 403 for
 * `/_next/static/*` unless the requesting origin is listed in
 * `allowedDevOrigins`. Loading the dev server from a phone therefore renders
 * the server HTML and then silently fails to hydrate — the app looks fine and
 * is completely dead to taps and swipes, with no visible error.
 *
 * The addresses are detected rather than hard-coded because DHCP reassigns
 * them; a pinned IP would work until the router disagreed and then reproduce
 * the same baffling symptom.
 */
function localAddresses(): string[] {
  const addrs = Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => (iface as { address: string }).address);

  const origins: string[] = [];
  for (const addr of addrs) {
    origins.push(addr, `${addr}:3000`, `${addr}:3001`, `${addr}:6006`);
  }
  return origins;
}

/** The data CDN's origin, for the CSP — avatars load from it directly. */
function dataOrigin(): string | null {
  const endpoint = process.env.DATA_ENDPOINT;
  if (!endpoint) return null;
  try {
    return new URL(endpoint).origin;
  } catch {
    return null;
  }
}

/*
 * Candidate enforcement policy, shipped as Report-Only first (per the August
 * 2026 review, S1): violations surface in the console on staging/preview
 * without breaking anything; the header graduates to
 * `Content-Security-Policy` once a few deploys have shown it quiet.
 *
 * `script-src 'unsafe-inline'` is a considered trade, not an oversight: the
 * pages are statically prerendered, so a nonce would force dynamic rendering,
 * and Next's own bootstrap (RSC payload, hydration) is inline scripts that
 * can't be hash-pinned ahead of time. Tightening script-src (hashing the one
 * hand-written inline script in lib/color-mode.ts, evaluating
 * 'strict-dynamic') is the decision to make at enforcement time.
 *
 * Framing is a per-path split: `/embed/<partner>/…` exists to be iframed and
 * gets `frame-ancestors *` (the Referer is not authenticatable, so a per-
 * partner ancestor allowlist would be theatre — the registry gates what
 * renders, not who may frame it); everything else denies.
 */
function contentSecurityPolicy(frameAncestors: string): string {
  const cdn = dataOrigin();
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    // React style props require 'unsafe-inline' in style-src.
    "style-src 'self' 'unsafe-inline'",
    // data:/blob: for the share-card export pipeline (html-to-image inlines
    // pixels; the preview/download run on object URLs).
    `img-src 'self' data: blob:${cdn ? ` ${cdn}` : ''}`,
    "font-src 'self' data:",
    // AppSignal's browser client reports errors directly; Plausible goes
    // through the same-origin rewrite above.
    "connect-src 'self' https://appsignal-endpoint.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
}

/** On every response, embedded or not. */
const baseSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Ignored over plain http, so harmless in dev.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/**
 * Dev is exempt from the CSP header only: `next dev`'s tooling runs on eval
 * and would report violations that production can never produce.
 */
function cspReportOnly(frameAncestors: string) {
  return process.env.NODE_ENV === 'development'
    ? []
    : [
        {
          key: 'Content-Security-Policy-Report-Only',
          value: contentSecurityPolicy(frameAncestors),
        },
      ];
}

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source rather than a build artifact, so
  // there is no build step between editing a component and seeing it here.
  transpilePackages: ['@vk/core', '@vk/database', '@vk/i18n', '@vk/tokens', '@vk/ui'],

  // Dev-only: lets phones and tablets on the same network load the JS bundle.
  // Production is unaffected — this key is ignored outside `next dev`.
  allowedDevOrigins: localAddresses(),

  /*
   * Plausible, served from this origin instead of plausible.io.
   *
   * An adblocker that recognises the third-party domain drops the request
   * before it's sent; a first-party path under this domain is indistinguishable
   * from the rest of the app's own traffic. The rewrite is unconditional —
   * whether anything ever hits it depends on whether the script tag is
   * rendered at all, which is gated on `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` in the
   * layout, not here.
   */
  async headers() {
    return [
      {
        // Everything except /embed/* — including bare `/embed`, which is a
        // 404 and may as well deny framing too.
        source: '/((?!embed/).*)',
        headers: [
          ...baseSecurityHeaders,
          { key: 'X-Frame-Options', value: 'DENY' },
          ...cspReportOnly("'none'"),
        ],
      },
      {
        // Embeds exist to be framed: no X-Frame-Options at all, and
        // frame-ancestors open — see contentSecurityPolicy() for why there is
        // no per-partner ancestor allowlist.
        source: '/embed/:path*',
        headers: [...baseSecurityHeaders, ...cspReportOnly('*')],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/js/script.tagged-events.outbound-links.js',
        destination: 'https://plausible.io/js/script.tagged-events.outbound-links.js',
      },
      {
        source: '/api/event',
        destination: 'https://plausible.io/api/event',
      },
    ];
  },
};

export default nextConfig;
