import type { MetadataRoute } from 'next';

/**
 * `/api/*` is data plumbing (session storage, OG image rendering, asset
 * proxying) — nothing there is a page a crawler should index.
 *
 * The `sitemap` field is only worth stating as an absolute URL — a relative
 * one is not a valid pointer in a file crawlers fetch standalone rather than
 * resolve against a page. Omitted rather than guessed at when
 * `NEXT_PUBLIC_BASE_URL` is unset, the same condition `app/sitemap.ts` and the
 * shared-result `metadataBase` (`app/[[...path]]/page.tsx`) key off of.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL;

  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
