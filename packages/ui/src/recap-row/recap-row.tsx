import { AnswerMark, type AnswerMarkTone } from '../answer-mark/answer-mark';
import { Icon } from '../icon/icon';
import styles from './recap-row.module.css';

/*
 * The row's tone is `AnswerMarkTone` outright — it is handed straight to
 * `AnswerMark` and this file draws nothing from it itself. It had been a
 * narrower three-value `RecapTone` of its own, which bought no safety (the mark
 * accepts all four) and quietly asserted that a recap row can never be
 * `neutral`. Skipped and never-reached still read identically, both as `none`:
 * both are "no position taken", and the recap acts on neither. `Přeskočit`
 * remains an action, it just draws no different mark than leaving a question
 * untouched.
 */

export type RecapRowLabels = {
  /** How this row's state reads aloud, e.g. "Souhlasím" or "Bez odpovědi". */
  answer: string;
  /** The star toggle's accessible name, e.g. "Pro mě důležité". */
  important: string;
};

export type RecapRowProps = {
  /** The short name — the row's headline. */
  title: string;
  tone: AnswerMarkTone;
  important: boolean;
  /**
   * Explicitly passed over. The mark still reads the same as a never-reached
   * question — the recap doesn't act on the difference — but the row itself
   * reads as secondary, and the star can't be armed from here: skipping
   * already clears "pro mě důležité" in the store, and re-arming it without
   * the actual question in front of you would attach the flag to a position
   * that was never taken.
   */
  skipped?: boolean;
  labels: RecapRowLabels;
  /** Opens the full question to change the answer. */
  onOpen: () => void;
  /** Toggled right here — it doesn't need the full card to change. */
  onToggleImportant: () => void;
};

/**
 * One question in the recap: a single line you can scan, not a card you have to
 * read.
 *
 * Two separate controls share one tile rather than the whole row being a
 * single button: the star is the same toggle the question card wears, and
 * toggling it here shouldn't have to open a dialog first. Everything else —
 * the title, the answer mark — opens the full question, because *that*
 * decision does need the card's actual statement in front of you.
 */
export function RecapRow({
  title,
  tone,
  important,
  skipped = false,
  labels,
  onOpen,
  onToggleImportant,
}: RecapRowProps) {
  return (
    <li className={styles.item}>
      <div className={styles.row} data-secondary={skipped || undefined}>
        <button
          type="button"
          className={styles.star}
          aria-pressed={important}
          aria-label={labels.important}
          title={labels.important}
          onClick={onToggleImportant}
          disabled={skipped}
        >
          <Icon name="star" size={15} filled={important} />
        </button>

        <button type="button" className={styles.open} onClick={onOpen}>
          <span className={styles.title}>{title}</span>

          <AnswerMark tone={tone} label={labels.answer} />
        </button>
      </div>
    </li>
  );
}
