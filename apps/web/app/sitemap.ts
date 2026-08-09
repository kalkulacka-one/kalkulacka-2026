import { buildRoute } from '@vk/core';
import { routeSlugs } from '@vk/i18n';
import type { MetadataRoute } from 'next';
import { listAvailableCalculators, listElections } from '../lib/calculators';

/**
 * Landing pages only: home, each election picker, each available
 * calculator's intro.
 *
 * Everything past the intro — question, recap, results — is stateful UX
 * reached by clicking through the flow, not an address meant to be indexed on
 * its own. Built from the same `lib/calculators` data layer the routes
 * themselves read, so this can never list a page the app does not actually
 * serve.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = routeSlugs();

  /*
   * Same env var and the same fallback as the shared-result `metadataBase` in
   * `app/[[...path]]/page.tsx`: there is no request here either, so the
   * absolute origin has to be configured. Left unset, the entries below stay
   * relative — not what the sitemap protocol wants, but it is what lets a
   * build with no backend env still produce a valid file instead of throwing.
   */
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';

  const elections = await listElections();
  const calculators = await listAvailableCalculators();

  const paths = [
    '/',
    ...elections.map(({ key }) => buildRoute({ kind: 'election', electionKey: key }, slugs)),
    ...calculators.map(({ electionKey, district }) =>
      buildRoute({ kind: 'calculator', electionKey, district, step: 'intro' }, slugs),
    ),
  ];

  return paths.map((path) => ({ url: `${base}${path}` }));
}
