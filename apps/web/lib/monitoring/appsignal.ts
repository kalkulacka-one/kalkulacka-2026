'use client';

import Appsignal from '@appsignal/javascript';
import { plugin as network } from '@appsignal/plugin-breadcrumbs-network';
import { plugin as windowEvents } from '@appsignal/plugin-window-events';

const APPSIGNAL_FRONTEND_KEY = process.env.NEXT_PUBLIC_APPSIGNAL_FRONTEND_KEY;

/**
 * `null` — and therefore every downstream call a no-op — whenever there's no
 * frontend key configured. That's the whole gate: no env means this module
 * never opens a connection to AppSignal, on the server (the `window` check)
 * or on a fork that hasn't set one up.
 */
export const appsignal = (() => {
  if (typeof window === 'undefined') return null;
  if (!APPSIGNAL_FRONTEND_KEY) return null;

  const revision = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() || 'development';

  const instance = new Appsignal({
    key: APPSIGNAL_FRONTEND_KEY,
    namespace: 'frontend',
    revision,
  });

  instance.use(windowEvents());
  instance.use(network());

  return instance;
})();
