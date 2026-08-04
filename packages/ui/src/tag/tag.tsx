import type { ReactNode } from 'react';
import styles from './tag.module.css';

export type TagProps = {
  children: ReactNode;
  /** `agree` for a positive callout (the winner), `neutral` for a plain label. */
  tone?: 'agree' | 'neutral';
};

/**
 * A small status label — a tinted pill, not styled text.
 *
 * Introduced for "Největší shoda" on the winner's row, which had been plain
 * uppercase coloured type with no shape of its own. That reads as an accent on
 * the name beside it rather than as the badge it is; a pill with a wash
 * background is legible as a distinct, named status at a glance.
 */
export function Tag({ children, tone = 'neutral' }: TagProps) {
  return <span className={`${styles.tag} ${styles[tone]}`}>{children}</span>;
}
