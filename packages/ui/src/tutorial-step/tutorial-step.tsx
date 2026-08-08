import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icon/icon';
import { VisuallyHidden } from '../visually-hidden/visually-hidden';
import styles from './tutorial-step.module.css';

export type TutorialStepProps = {
  /** The gesture or control being taught, drawn from the app's own icon set. */
  icon: IconName;
  title: string;
  description: string;
  /**
   * The reader has performed this gesture on the practice card. Omitted where
   * there is nothing to practise on — the help overlay, and the steps that
   * describe a screen rather than a gesture.
   */
  done?: boolean;
  /** Announced in place of the tick, which is decorative. */
  doneLabel?: string;
  /** Optional live demonstration — a real card to try the gesture on. */
  children?: ReactNode;
};

/**
 * One thing the tutorial teaches.
 *
 * The badge doubles as the practice checklist: when the gesture has been tried
 * on the live card it keeps its own icon — the row still has to be scannable by
 * what it teaches — and gains a tick in the corner. Swapping the icon out for a
 * tick would have made four completed steps identical to each other.
 */
export function TutorialStep({
  icon,
  title,
  description,
  done,
  doneLabel,
  children,
}: TutorialStepProps) {
  return (
    <li className={styles.step}>
      <span className={`${styles.badge} ${done ? styles.badgeDone : ''}`}>
        <Icon name={icon} size={20} />

        {done ? (
          <span className={styles.tick}>
            <Icon name="checkThin" size={12} />
            {doneLabel ? <VisuallyHidden>{doneLabel}</VisuallyHidden> : null}
          </span>
        ) : null}
      </span>

      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.description}>{description}</p>
        {children}
      </div>
    </li>
  );
}
