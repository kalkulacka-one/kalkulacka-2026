import { Icon } from '../icon/icon';
import { VisuallyHidden } from '../visually-hidden/visually-hidden';
import styles from './recap-row.module.css';

/**
 * The three states a recap row can report. Skipped and never-reached read
 * identically here — both are "no position taken", and splitting them into two
 * marks asked someone to care about a distinction the recap itself doesn't act
 * on. `Přeskočit` still exists as an action; it just no longer draws a
 * different mark than leaving a question untouched would.
 */
export type RecapTone = 'agree' | 'disagree' | 'none';

export type RecapRowLabels = {
  /** How this row's state reads aloud, e.g. "Souhlasím" or "Bez odpovědi". */
  answer: string;
  /** The star toggle's accessible name, e.g. "Pro mě důležité". */
  important: string;
};

export type RecapRowProps = {
  /** The short name — the row's headline. */
  title: string;
  tone: RecapTone;
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

          <span className={`${styles.mark} ${styles[tone]}`}>
            {/* The same heavy marks the question card's own answer buttons use —
                this row is a compressed reading of that card, not a different
                visual language for the same two answers. */}
            {tone === 'agree' ? <Icon name="check" size={11} /> : null}
            {tone === 'disagree' ? <Icon name="cross" size={11} /> : null}
            <VisuallyHidden>{labels.answer}</VisuallyHidden>
          </span>
        </button>
      </div>
    </li>
  );
}
