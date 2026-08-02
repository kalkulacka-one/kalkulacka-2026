import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source rather than a build artifact, so
  // there is no build step between editing a component and seeing it here.
  transpilePackages: ['@vk/core', '@vk/i18n', '@vk/tokens', '@vk/ui'],
};

export default nextConfig;
