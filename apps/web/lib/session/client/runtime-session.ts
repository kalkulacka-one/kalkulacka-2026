import { buildCookieName } from '../shared';

/*
 * Keyed like the cookie it mirrors: an embed's session lives under the
 * suffixed name (`<cookie>_embed_<partner>`), so a browser that carries both a
 * first-party session and a partner-embed session keeps them apart here the
 * same way the server keeps their cookies apart.
 */
const sessionIds = new Map<string, string>();

export function getRuntimeSessionId(embedName?: string): string | undefined {
  const storageKey = buildCookieName({ embedName });

  const cached = sessionIds.get(storageKey);
  if (cached) return cached;

  const stored = sessionStorage.getItem(storageKey) || undefined;
  if (stored) sessionIds.set(storageKey, stored);

  return stored;
}

export function setRuntimeSessionId(id: string, embedName?: string): void {
  const storageKey = buildCookieName({ embedName });
  sessionIds.set(storageKey, id);
  sessionStorage.setItem(storageKey, id);
}
