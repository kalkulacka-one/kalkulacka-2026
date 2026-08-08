'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'vk-color-mode';

export type ColorMode = 'light' | 'dark';

function systemMode(): ColorMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedMode(): ColorMode | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * Repaints the browser's own chrome to match the page.
 *
 * `theme-color` is normally written once, in `layout.tsx`, and Next's usual
 * shape for it is a pair of tags gated on `prefers-color-scheme` — which is
 * the OS preference, and therefore wrong the moment someone overrides the
 * mode in this app. So the served HTML carries exactly one, un-gated tag (see
 * the `viewport` export) and this is what keeps it current: read the colour
 * the page has actually resolved to and hand Safari that.
 *
 * `<html>` rather than `<body>` because it is the element that reaches behind
 * a collapsing address bar, and *resolved* rather than the `--vk-color-page`
 * token because that token is a `light-dark()` expression the browser will
 * not parse in a meta tag.
 *
 * Every matching tag, not the first: React hoists its own copy of the metadata
 * into `<head>` on hydration, so the document can briefly hold two. A browser
 * applies whichever it finds first, and writing both means it does not matter
 * which that is.
 */
function syncBrowserThemeColor() {
  const color = getComputedStyle(document.documentElement).backgroundColor;
  if (!color) return;

  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', color);
  }
}

/**
 * The resolved light/dark mode, plus a setter that persists an explicit
 * override.
 *
 * Until someone toggles it, there is no override: `base.css`'s
 * `[data-mode]` rules are absent, `color-scheme: light dark` stands, and the
 * page already tracks the OS pick on its own — this hook only has to layer
 * persistence and the `<html data-mode>` write on top for the one moment
 * someone actually switches it. `bootstrapColorMode` (in `layout.tsx`) is
 * what keeps that write from flashing the wrong mode on load.
 */
export function useColorMode(): [ColorMode, () => void] {
  // Two pieces of state rather than one, because "dark because the OS says so"
  // and "dark because someone asked for it" are not the same fact: only the
  // second is persisted, and only the second writes `data-mode`. Both start at
  // their server-safe guess and are corrected in the effect below (which runs
  // before anything visible — the menu this feeds is closed by default), so a
  // same-frame mismatch is never seen.
  const [override, setOverride] = useState<ColorMode | null>(null);
  const [system, setSystem] = useState<ColorMode>('light');
  const mode = override ?? system;

  useEffect(() => {
    setOverride(storedMode());
    setSystem(systemMode());

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystem(systemMode());
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (override === null) return;
    localStorage.setItem(STORAGE_KEY, override);
    document.documentElement.dataset.mode = override;
  }, [override]);

  // Declared after the write above so it reads the DOM in its new mode, and
  // keyed on the resolved `mode` so an OS switch repaints the chrome too — not
  // just an in-app toggle.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `mode` is the trigger; the colour itself is read from the DOM.
  useEffect(() => {
    syncBrowserThemeColor();
  }, [mode]);

  const toggle = useCallback(() => {
    setOverride(mode === 'dark' ? 'light' : 'dark');
  }, [mode]);

  return [mode, toggle];
}

/**
 * Runs synchronously, before first paint, as an inline `beforeInteractive`
 * script (see `layout.tsx`) — the only way to apply a stored override without
 * a flash of the system's mode first. Stringified into the page rather than
 * imported, so keep it self-contained (no closures over module scope).
 *
 * It writes `theme-color` for the same reason it writes `data-mode`: the tag
 * in the served HTML is a fixed colour, and a browser that reads it before
 * this runs paints its address bar light around a dark page. Deliberately a
 * `content` mutation and not a new tag — the served one is React's, and
 * replacing it here would be a hydration mismatch. `syncBrowserThemeColor`
 * does exactly the same thing at runtime; the duplication is the price of a
 * script that cannot import anything.
 */
export const bootstrapColorMode = `
try {
  var m = localStorage.getItem('${STORAGE_KEY}');
  if (m === 'light' || m === 'dark') document.documentElement.dataset.mode = m;

  var c = getComputedStyle(document.documentElement).backgroundColor;
  if (c) document.querySelectorAll('meta[name="theme-color"]').forEach(function (t) {
    t.setAttribute('content', c);
  });
} catch (e) {}
`;
