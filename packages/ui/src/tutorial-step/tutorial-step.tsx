import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icon/icon';
import styles from './tutorial-step.module.css';

export type TutorialStepProps = {
  /** The gesture or control being taught, drawn from the app's own icon set. */
  icon: IconName;
  title: string;
  description: string;
  /** Optional live demonstration — a real card to try the gesture on. */
  children?: ReactNode;
};

/**
 * One thing the tutorial teaches.
 *
 * Deliberately plain: this is the functional-first pass, and how the swipe
 * gestures are actually taught (probably with a live demo card rather than a
 * static icon) is a Phase 6 conversation.
 */
export function TutorialStep({ icon, title, description, children }: TutorialStepProps) {
  return (
    <li className={styles.step}>
      <span className={styles.badge}>
        <Icon name={icon} size={20} />
      </span>

      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.description}>{description}</p>
        {children}
      </div>
    </li>
  );
}
