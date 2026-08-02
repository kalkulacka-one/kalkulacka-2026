import type { ReactNode } from 'react';
import styles from './sticky-bar.module.css';

export type StickyBarProps = {
  children: ReactNode;
  /** Reads as part of the page rather than a floating layer over it. */
  variant?: 'floating' | 'flat';
};

/**
 * The pinned action strip at the bottom of a scrolling screen.
 *
 * Sticky rather than fixed, so it participates in its scroll container's layout
 * and cannot end up overlapping the last list item — the usual failure of a
 * fixed bar over a list whose padding nobody remembered to grow.
 */
export function StickyBar({ children, variant = 'floating' }: StickyBarProps) {
  return <div className={`${styles.bar} ${styles[variant]}`}>{children}</div>;
}
