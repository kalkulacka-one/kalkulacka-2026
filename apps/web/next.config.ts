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
