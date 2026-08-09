import { getMessages } from '@vk/i18n';
import { Button, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { Screen } from '../components/screen';

const messages = getMessages();

/**
 * What every `notFound()` call in the catch-all route renders into.
 *
 * Next's own default 404 would render here otherwise — and the root layout's
 * fixed backdrop sits *above* it (see `app/layout.tsx`), so that default page
 * is visually swallowed, reading as a near-blank screen rather than as part of
 * the app. `Screen` is the same shell every other page uses, so a bad address
 * lands somewhere recognisable instead.
 */
export default function NotFound() {
  return (
    <Screen
      title={messages.notFound.title}
      description={messages.notFound.description}
      footer={
        <StickyBar>
          <Button as={Link} href="/" size="large">
            {messages.notFound.homeLabel}
          </Button>
        </StickyBar>
      }
    >
      {null}
    </Screen>
  );
}
