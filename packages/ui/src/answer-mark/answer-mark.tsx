import { Icon, type IconName } from '../icon/icon';
import { VisuallyHidden } from '../visually-hidden/visually-hidden';
import styles from './answer-mark.module.css';

/**
 * Which of the answer colours the mark wears.
 *
 * Deliberately not the domain's `true | false | null | undefined` — this package
 * knows about tones, and the app decides which tone an answer maps to. `none` is
 * the absence of a position; `neutral` is an explicit "nevím", which is a real
 * answer that simply takes no side.
 */
export type AnswerMarkTone = 'agree' | 'disagree' | 'neutral' | 'none';

export type AnswerMarkProps = {
  tone: AnswerMarkTone;
  /**
   * Read in place of the shape, e.g. "Souhlasím".
   *
   * Omit it only where the mark is genuinely decorative and something around it
   * already carries the meaning — the calculating screen's film strip is the one
   * such place. Anywhere a mark *is* the statement of an answer, it needs this:
   * without it the row says nothing at all to a screen reader.
   */
  label?: string;
  /** `small` for a dense comparison row, `medium` for a recap row. */
  size?: 'small' | 'medium';
  className?: string;
};

const ICONS: Record<AnswerMarkTone, IconName | undefined> = {
  agree: 'check',
  disagree: 'cross',
  neutral: 'neutral',
  none: undefined,
};

const ICON_SIZE = { small: 9, medium: 11 } as const;

/**
 * A recorded position, as a single circle.
 *
 * The heavy marks the question card's own answer buttons use, at reading scale
 * — a row wearing one of these is a compressed reading of that card, not a
 * different visual language for the same two answers. Introduced by the recap
 * and shared with the results comparison so the two screens agree on what a
 * "yes" looks like.
 */
export function AnswerMark({ tone, label, size = 'medium', className }: AnswerMarkProps) {
  const icon = ICONS[tone];

  return (
    <span className={`${styles.mark} ${styles[tone]} ${styles[size]} ${className ?? ''}`}>
      {icon ? <Icon name={icon} size={ICON_SIZE[size]} /> : null}
      {label ? <VisuallyHidden>{label}</VisuallyHidden> : null}
    </span>
  );
}
