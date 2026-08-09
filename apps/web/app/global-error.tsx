'use client';

import { activeLocale, getMessages } from '@vk/i18n';
import { useEffect } from 'react';
import { reportError } from '../lib/monitoring';

const messages = getMessages();

/**
 * What renders if the root layout itself throws — `error.tsx` can't catch
 * that, since it's a child of the layout it would need to replace. This is
 * the one screen in the app that can't lean on `Screen`, `AppShell`, or any
 * token CSS: the layout that loads them is exactly what's broken. Plain,
 * inline-styled markup and its own `<html>`/`<body>`, so it renders even when
 * everything below it has failed.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reportError(error, { digest: error.digest, boundary: 'global' });
  }, [error]);

  return (
    <html lang={activeLocale()}>
      <body>
        <p>{messages.errorPage.description}</p>
      </body>
    </html>
  );
}
