'use client';

import { useLayoutEffect } from 'react';

/**
 * Applies an embed partner's token theme for the life of the embed.
 *
 * The attribute has to land on `<html>` — the root layout stamps
 * `data-theme="default"` there, and the backdrop shader (a sibling of the page,
 * kept alive in the root layout) resolves its colours against the root, so a
 * theme scoped to the page's own subtree would paint themed content over a
 * default-coloured wash.
 *
 * Known gap, deliberately left until a partner theme exists (Phase F1): the
 * backdrop re-reads its colours on OS scheme flips, not on `data-theme`
 * mutations, so the wash may keep default colours until the next repaint
 * trigger. If F1's themes hit this, the fix is likely a pre-hydration inline
 * script (route → theme map) rather than more listeners here.
 */
export function EmbedTheme({ theme }: { theme: string }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-theme');
    root.setAttribute('data-theme', theme);
    return () => {
      root.setAttribute('data-theme', previous ?? 'default');
    };
  }, [theme]);

  return null;
}
