import { Icon } from '@vk/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './screen.module.css';

export type ScreenProps = {
  title: string;
  /** Small line above the title — usually the calculator or election name. */
  eyebrow?: string;
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
 * other screen has a list that must scroll, so scrolling happens *here*, inside
 * one container, rather than by unpinning the document and reintroducing the
 * bounce the flow spent Phase 2 getting rid of.
 */
export function Screen({ title, eyebrow, description, back, children, footer }: ScreenProps) {
  return (
    <main className={styles.screen}>
      <div className={styles.inner}>
        <header className={styles.header}>
          {back ? (
            <Link className={styles.back} href={back.href}>
              <Icon name="chevronLeftThin" size={16} />
              {back.label}
            </Link>
          ) : null}

          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.title}>{title}</h1>
          {description ? <p className={styles.description}>{description}</p> : null}
        </header>

        {children}

        {/* `margin-top: auto` keeps the bar at the bottom of a short screen
            rather than floating directly under the content. */}
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </main>
  );
}
