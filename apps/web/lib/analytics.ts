declare global {
  interface Window {
    /**
     * Installed by the Plausible script tag itself — absent whenever that
     * script never loaded, which is the only signal this module needs.
     */
    plausible?: (
      name: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

/**
 * Fire a Plausible custom event. A no-op wherever `window.plausible` isn't
 * there to answer — no env var, script blocked, script still loading, or a
 * server render calling this by mistake — so every call site can fire and
 * forget without checking whether analytics is even on.
 */
export function trackEvent(name: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;
  window.plausible?.(name, props ? { props } : undefined);
}
