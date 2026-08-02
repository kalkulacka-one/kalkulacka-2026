import { Chip } from '../chip/chip';
import { Icon } from '../icon/icon';
import { VisuallyHidden } from '../visually-hidden/visually-hidden';
import styles from './recap-item.module.css';

export type RecapItemLabels = {
  agree: string;
  disagree: string;
  important: string;
  /** Marks a question that was explicitly skipped, e.g. "Přeskočeno". */
  skipped: string;
  /** Accessible name for the jump-back control, e.g. "Otevřít otázku 7". */
  open: string;
};

export type RecapItemProps = {
  /** 1-based, shown as the row's index. */
  position: number;
  statement: string;
  /** The short name — the outlined chip. */
  title: string;
  /** Topic — the filled chip. Absent in data that has no tags. */
  topic?: string;
  agree: boolean;
  disagree: boolean;
  important: boolean;
  /** Explicitly skipped, as opposed to simply never answered. */
  skipped: boolean;
  labels: RecapItemLabels;
  /** `true` re-chooses agree, `false` disagree. Choosing the current one clears it. */
  onAnswer: (agree: boolean) => void;
  onToggleImportant: () => void;
  /** Jump back to this question in the deck. */
  onOpen: () => void;
};

/**
 * One question in the recap, answerable in place.
 *
 * Editing here writes straight to the same store the deck writes to, so the two
 * screens cannot disagree — the recap is a second view of the answers, not a
 * copy of them. The statement doubles as the jump-back control for anyone who
 * wants the full card, its detail text and the gestures instead.
 */
export function RecapItem({
  position,
  statement,
  title,
  topic,
  agree,
  disagree,
  important,
  skipped,
  labels,
  onAnswer,
  onToggleImportant,
  onOpen,
}: RecapItemProps) {
  const unanswered = !agree && !disagree;

  return (
    <li className={`${styles.item} ${unanswered ? styles.unanswered : ''}`}>
      <div className={styles.head}>
        <span className={styles.position}>{position}</span>
        <span className={styles.chips}>
          {topic ? <Chip>{topic}</Chip> : null}
          <Chip variant="outline">{title}</Chip>
          {skipped && unanswered ? <span className={styles.skipped}>{labels.skipped}</span> : null}
        </span>
      </div>

      <button type="button" className={styles.statement} onClick={onOpen}>
        <VisuallyHidden>{labels.open}</VisuallyHidden>
        <span aria-hidden="true">{statement}</span>
      </button>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.answer} ${styles.agree}`}
          aria-pressed={agree}
          onClick={() => onAnswer(true)}
        >
          <Icon name="checkThin" size={16} />
          {labels.agree}
        </button>

        <button
          type="button"
          className={`${styles.answer} ${styles.disagree}`}
          aria-pressed={disagree}
          onClick={() => onAnswer(false)}
        >
          <Icon name="crossThin" size={16} />
          {labels.disagree}
        </button>

        <button
          type="button"
          className={styles.star}
          aria-pressed={important}
          aria-label={labels.important}
          onClick={onToggleImportant}
        >
          <Icon name="starThin" size={18} filled={important} />
        </button>
      </div>
    </li>
  );
}
