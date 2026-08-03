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
  // The client-rendered guess is corrected in the effect below (which runs
  // before paint's worth of anything visible — the menu this feeds is closed
  // by default), so a same-frame mismatch here is never seen.
  const [mode, setMode] = useState<ColorMode>('light');

  useEffect(() => {
    setMode(storedMode() ?? systemMode());

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (storedMode() === null) setMode(systemMode());
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const toggle = useCallback(() => {
    setMode((current) => {
      const next: ColorMode = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.dataset.mode = next;
      return next;
    });
  }, []);

  return [mode, toggle];
}

/**
 * Runs synchronously, before first paint, as an inline `beforeInteractive`
 * script (see `layout.tsx`) — the only way to apply a stored override without
 * a flash of the system's mode first. Stringified into the page rather than
 * imported, so keep it self-contained (no closures over module scope).
 */
export const bootstrapColorMode = `
try {
  var m = localStorage.getItem('${STORAGE_KEY}');
  if (m === 'light' || m === 'dark') document.documentElement.dataset.mode = m;
} catch (e) {}
`;
