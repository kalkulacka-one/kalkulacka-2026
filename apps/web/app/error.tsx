'use client';

import { getMessages } from '@vk/i18n';
import { Button, StickyBar } from '@vk/ui';
import { useEffect } from 'react';
import { Screen } from '../components/screen';

const messages = getMessages();

/**
 * What any uncaught error in a page or layout below the root renders into.
 *
 * Sibling to `not-found.tsx`: the same `Screen` shell, for the same reason —
 * the root layout's fixed backdrop sits above Next's own default error UI, so
 * that default reads as a near-blank screen rather than as part of the app.
 * `reset()` re-renders the segment that threw instead of a full navigation,
 * so a transient failure can recover without losing the URL.
 */
export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Client-side error boundaries are the one place left that never reaches a
  // server log on their own — this is what puts the failure somewhere visible.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Screen
      title={messages.errorPage.title}
      description={messages.errorPage.description}
      footer={
        <StickyBar>
          <Button size="large" onClick={reset}>
            {messages.errorPage.retry}
          </Button>
        </StickyBar>
      }
    >
      {null}
    </Screen>
  );
}
