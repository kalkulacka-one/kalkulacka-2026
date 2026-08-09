'use client';

import '../lib/monitoring/appsignal';

/**
 * Nothing to render — the side effect is the point.
 *
 * `appsignal.ts` builds its client instance the moment it's imported, and the
 * window/network breadcrumb plugins are only worth having if they've been
 * collecting since the page loaded, not from the moment something already
 * went wrong. Mounted once, here, so every screen gets the same boot rather
 * than each one importing `reportError` and hoping it happened first.
 */
export function MonitoringBoot() {
  return null;
}
