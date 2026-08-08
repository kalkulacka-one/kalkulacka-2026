import { getMessages } from '@vk/i18n';
import { AppHeader } from '@vk/ui';
import type { ReactNode } from 'react';
import type { CalculatorRef } from '../lib/paths';
import { AppMenu } from './app-menu';
import styles from './app-shell.module.css';
import { ScrollMode, type ScrollModeValue } from './scroll-mode';

export type AppShellProps = {
  /** The election's display name, shown next to the wordmark. */
  electionName?: string;
  /** The chosen region/district, shown between the election type and year. */
  calculatorName?: string;
  /** Passed to the menu; without it, restart and leave are not offered. */
  calculator?: { id: string } & CalculatorRef;
  /**
   * What scrolls on this screen.
   *
   * `document` for anything that is read: its content is then the only thing
   * on the page that can pass under Safari's glass address bar, and a
   * `StickyBar` inside it settles snugly above the bar rather than against
   * `dvh`'s far more pessimistic idea of where the bar starts.
   *
   * `pinned` (the default) is for the question flow, which must not scroll at
   * all — see `globals.css` for what each mode does and why.
   */
  scroll?: ScrollModeValue;
  children: ReactNode;
};

const messages = getMessages();

/**
 * Header and menu — the frame that does not change between screens.
 *
 * The shell owns the full screen and never scrolls; whatever it wraps decides
 * whether *it* scrolls. That is what lets the question flow (fixed, unscrollable
 * by design) and the content screens (a scrolling list) share one header instead
 * of each rebuilding the chrome around their own layout. The backdrop is *not*
 * here — it sits in the root layout, which the router keeps alive across
 * navigations, so the wash never restarts mid-flow.
 */
export function AppShell({
  electionName,
  calculatorName,
  calculator,
  scroll = 'pinned',
  children,
}: AppShellProps) {
  return (
    <div className={styles.shell}>
      <ScrollMode mode={scroll} />

      <div className={styles.content}>
        <div className={styles.bar}>
          <AppHeader
            title={messages.app.title}
            electionName={electionName}
            calculatorName={calculatorName}
            actions={<AppMenu calculator={calculator} />}
          />
        </div>

        {children}
      </div>
    </div>
  );
}
