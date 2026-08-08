import type { ReactNode } from 'react';
import type { CalculatorRef } from '../lib/paths';
import { AppShell } from './app-shell';
import { BackLink } from './back-link';
import styles from './screen.module.css';

export type ScreenProps = {
  title: string;
  /**
   * The election's display name. Goes to the shell's header rather than above
   * the title — it is the same fact on every screen of a calculator, so it
   * belongs to the chrome, not to each page's copy.
   */
  electionName?: string;
  /** The chosen region/district, shown between the election type and year. */
  calculatorName?: string;
  /** Gives the shell menu its restart and leave actions. */
  calculator?: { id: string } & CalculatorRef;
  description?: string;
  /** A back link, rendered as a real anchor so it can be opened in a new tab. */
  back?: { href: string; label: string };
  children: ReactNode;
  /** Pinned to the bottom of the scroll area. Pass a `StickyBar`. */
  footer?: ReactNode;
};

/**
 * The shell every screen except the question flow uses.
 *
 * The flow is deliberately unscrollable — the deck fills the viewport and iOS
 * elastic bounce is pinned away at the document level in `globals.css`. Every
 * other screen has a list that must scroll, and it is the *document* that
 * scrolls for them (`scroll="document"`): an inner container was tidier, but it
 * is also the one arrangement iOS will not let paint under its glass address
 * bar, and it pins a `StickyBar` to `dvh` instead of to the bar itself.
 */
export function Screen({
  title,
  electionName,
  calculatorName,
  calculator,
  description,
  back,
  children,
  footer,
}: ScreenProps) {
  return (
    <AppShell
      electionName={electionName}
      calculatorName={calculatorName}
      calculator={calculator}
      scroll="document"
    >
      <main className={styles.screen}>
        <div className={styles.inner}>
          <header className={styles.header}>
            {back ? <BackLink href={back.href} label={back.label} /> : null}

            <h1 className={styles.title}>{title}</h1>
            {description ? <p className={styles.description}>{description}</p> : null}
          </header>

          {children}

          {/* `margin-top: auto` keeps the bar at the bottom of a short screen
              rather than floating directly under the content. */}
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </div>
      </main>
    </AppShell>
  );
}
