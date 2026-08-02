import { Icon, type IconName } from '../icon/icon';
import styles from './answer-pill.module.css';

/**
 * Which of the answer colours the pill wears. Deliberately not the domain's
 * `true | false | null | undefined` — this package knows about tones, and the
 * app decides which tone an answer maps to.
 */
export type AnswerTone = 'agree' | 'disagree' | 'neutral' | 'none';

export type AnswerPillProps = {
  tone: AnswerTone;
  label: string;
  size?: 'small' | 'medium';
};

const ICONS: Record<AnswerTone, IconName | undefined> = {
  agree: 'checkThin',
  disagree: 'crossThin',
  neutral: undefined,
  none: undefined,
};

/** A read-only statement of a recorded position — in the recap and comparison. */
export function AnswerPill({ tone, label, size = 'medium' }: AnswerPillProps) {
  const icon = ICONS[tone];

  return (
    <span className={`${styles.pill} ${styles[tone]} ${styles[size]}`}>
      {icon ? <Icon name={icon} size={size === 'small' ? 13 : 15} /> : null}
      {label}
    </span>
  );
}
