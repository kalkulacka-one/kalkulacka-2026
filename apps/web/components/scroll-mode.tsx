'use client';

import { useEffect } from 'react';

export type ScrollModeValue = 'pinned' | 'document';

/**
 * Puts the current screen's scroll mode on `<html>`, where `globals.css` can
 * act on it.
 *
 * It has to be the root element: whether the *document* scrolls is not
 * something a component inside it can decide, and the root layout owns `<html>`
 * on every route. Hence an effect rather than markup — and hence this being a
 * component rather than a hook, so the server-rendered `AppShell` can drop it
 * in without becoming a client component itself.
 *
 * `pinned` is the absence of the attribute, so it is also what a screen gets
 * before hydration and if this never runs.
 */
export function ScrollMode({ mode }: { mode: ScrollModeValue }) {
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'document') root.dataset.vkScroll = 'document';
    else delete root.dataset.vkScroll;

    // Not cleared on unmount: between two screens both this and the next
    // screen's `ScrollMode` run, and a cleanup here would fight whichever
    // order they happen to land in. Each mount states the mode outright.
  }, [mode]);

  /*
   * A second flag, only meaningful in `document` mode: whether the page has
   * moved off its top edge. The sticky header (`app-shell.module.css`) reads
   * this to bring in its glass surface only once there is something to
   * separate itself from — at rest, on a page shorter than the screen or
   * freshly loaded, a translucent bar with nothing behind it just draws a
   * hard seam under the wordmark for no reason.
   */
  useEffect(() => {
    if (mode !== 'document') return;

    const root = document.documentElement;
    const read = () => {
      // Same 4px dead zone the recap's own top fade uses — enough to ignore
      // the sub-pixel scroll position iOS sometimes reports at rest.
      if (window.scrollY > 4) root.dataset.vkHeaderSurface = '';
      else delete root.dataset.vkHeaderSurface;
    };

    read();
    window.addEventListener('scroll', read, { passive: true });
    return () => {
      window.removeEventListener('scroll', read);
      delete root.dataset.vkHeaderSurface;
    };
  }, [mode]);

  return null;
}
