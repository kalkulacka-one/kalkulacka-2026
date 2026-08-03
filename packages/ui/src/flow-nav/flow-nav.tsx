import { Icon } from '../icon/icon';
import { VisuallyHidden } from '../visually-hidden/visually-hidden';
import styles from './flow-nav.module.css';

export type FlowNavProps = {
  /** 1-based position of the question on screen. */
  position: number;
  total: number;
  onPrevious: () => void;
  /** Advances — skipping the question if it has no answer yet. */
  onForward: () => void;
  canGoBack: boolean;
  /**
   * The forward control reads as "Další" once an answer exists and
   * "Přeskočit" while it does not.
   */
  forwardLabel: string;
  previousLabel: string;
  /** Highlight the control because this question was explicitly skipped. */
  isSkipped?: boolean;
  /**
   * Highlight the control because the answer was just cleared — re-tapping an
   * already-chosen position, which leaves the question unanswered again right
   * as someone is looking at it. A transient nudge toward "Přeskočit" rather
   * than `isSkipped`'s persisted state.
   */
  attention?: boolean;
  /** e.g. "Otázka 3 ze 42", for assistive tech. */
  counterLabel: string;
};

export function FlowNav({
  position,
  total,
  onPrevious,
  onForward,
  canGoBack,
  forwardLabel,
  previousLabel,
  isSkipped = false,
  attention = false,
  counterLabel,
}: FlowNavProps) {
  return (
    <nav className={styles.nav}>
      <button
        type="button"
        className={`${styles.button} ${styles.previous}`}
        onClick={onPrevious}
        disabled={!canGoBack}
      >
        <Icon name="chevronLeft" size={15} />
        <span>{previousLabel}</span>
      </button>

      <p className={styles.counter}>
        <VisuallyHidden>{counterLabel}</VisuallyHidden>
        <span aria-hidden="true">
          <span className={styles.position}>{position}</span>/{total}
        </span>
      </p>

      <button
        type="button"
        className={`${styles.button} ${styles.forward} ${isSkipped || attention ? styles.skipped : ''}`}
        onClick={onForward}
      >
        <span>{forwardLabel}</span>
        <Icon name="chevronRight" size={15} />
      </button>
    </nav>
  );
}
