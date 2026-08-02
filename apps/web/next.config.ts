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
  return Object.values(networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => (iface as { address: string }).address);
}

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source rather than a build artifact, so
  // there is no build step between editing a component and seeing it here.
  transpilePackages: ['@vk/core', '@vk/i18n', '@vk/tokens', '@vk/ui'],

  // Dev-only: lets phones and tablets on the same network load the JS bundle.
  // Production is unaffected — this key is ignored outside `next dev`.
  allowedDevOrigins: localAddresses(),
};

export default nextConfig;
