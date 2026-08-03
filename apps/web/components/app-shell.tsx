import { getMessages } from '@vk/i18n';
import { AppHeader } from '@vk/ui';
import type { ReactNode } from 'react';
import type { CalculatorRef } from '../lib/paths';
import { AppMenu } from './app-menu';
import styles from './app-shell.module.css';

export type AppShellProps = {
  /** The election's display name, shown next to the wordmark. */
  electionName?: string;
  /** The chosen region/district, shown between the election type and year. */
  calculatorName?: string;
  /** Passed to the menu; without it, restart and leave are not offered. */
  calculator?: { id: string } & CalculatorRef;
  children: ReactNode;
};

const messages = getMessages();

/**
 * Header and menu — the frame that does not change between screens.
 *
 * The shell owns the full viewport and never scrolls; whatever it wraps decides
 * whether *it* scrolls. That is what lets the question flow (fixed, unscrollable
 * by design) and the content screens (a scrolling list) share one header instead
 * of each rebuilding the chrome around their own layout. The backdrop is *not*
 * here — it sits in the root layout, which the router keeps alive across
 * navigations, so the wash never restarts mid-flow.
 */
export function AppShell({ electionName, calculatorName, calculator, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
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
