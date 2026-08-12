import type { NextRequest } from 'next/server';
import { isEmbedName } from '@/config/embeds';

/**
 * Which embed, if any, a session request belongs to — read off the Referer
 * path, because that is the one thing an iframe's same-origin fetches carry
 * for free (our Referrer-Policy only trims cross-origin requests).
 *
 * The Referer is client-controlled, so the extracted segment is only accepted
 * if the partner registry knows it (review item S7): the name becomes a cookie
 * name suffix and a stored session attribute, and an unregistered value —
 * which also 404s as a page — is not an embed, just a request wearing one's
 * clothes.
 */
export function getEmbedNameFromRequest(request: NextRequest): string | undefined {
  const referer = request.headers.get('referer');

  if (!referer) {
    return undefined;
  }

  try {
    const url = new URL(referer);
    const pathParts = url.pathname.split('/').filter(Boolean);

    const embedIndex = pathParts.indexOf('embed');
    const name = embedIndex !== -1 ? pathParts[embedIndex + 1] : undefined;
    if (name && isEmbedName(name)) {
      return name;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
