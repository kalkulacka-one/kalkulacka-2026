import type { ReactNode, PointerEvent as ReactPointerEvent, Ref } from 'react';
import { Chip } from '../chip/chip';
import { Icon } from '../icon/icon';
import styles from './question-card.module.css';

/** Everything the card needs to render one question. */
export type QuestionCardContent = {
  id: string;
  /**
   * The statement being agreed or disagreed with.
   *
   * Optional because the tutorial's practice card has nothing to agree with:
   * it is a surface to put your hands on, and the only text it carries is the
   * instruction for doing so, which belongs in `detail`. Every card in the
   * flow itself has one.
   */
  statement?: string;
  /**
   * Short label for the outlined chip. Optional along with `topic` — the
   * practice card has neither, so the chips row it would have started can be
   * skipped instead of rendered empty.
   */
  title?: string;
  /** Optional explainer paragraph. */
  detail?: string;
  /** Topic, shown as the filled chip. */
  topic?: string;
};

/** Which control reads as selected. */
export type CardSelection = {
  agree: boolean;
  disagree: boolean;
  important: boolean;
};

export type QuestionCardLabels = {
  agree: string;
  disagree: string;
  important: string;
};

export type QuestionCardProps = {
  content: QuestionCardContent;
  selection: CardSelection;
  labels: QuestionCardLabels;
  /** Omitted for the decorative cards stacked behind the active one. */
  onAgree?: () => void;
  onDisagree?: () => void;
  onToggleImportant?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  /**
   * A classic corner close control — only ever set by the recap's dialog,
   * which is the one place a question card is dismissible without being
   * answered. The deck never passes this: its cards leave by swiping or
   * answering, not by being closed.
   */
  close?: { label: string; onClose: () => void };
  /**
   * Decoration drawn over the card's own content — the tutorial's drag
   * compass, and nothing else so far. Inside the card rather than layered on
   * the deck above it, so it travels with the card under a drag: an arrow that
   * stayed behind while the card moved would be pointing at where the card used
   * to be.
   */
  guides?: ReactNode;
  /**
   * What element the statement is drawn as.
   *
   * A paragraph by default, which is what the stacked, ghosted and practice
   * cards want — none of them is the thing a reader has arrived at. The card
   * actually being answered passes a heading instead: on the question flow the
   * statement *is* the screen's content, and drawn as a `<p>` it left that
   * screen with no heading at all for a screen reader to navigate by. Styling
   * lives entirely in `.statement`, so this changes the semantics and nothing
   * about how the card looks.
   */
  statementAs?: 'p' | 'h1' | 'h2';
  /** Non-interactive cards are hidden from assistive tech and the tab order. */
  inert?: boolean;
  elevation?: 'active' | 'next' | 'back' | 'lifted';
  ref?: Ref<HTMLDivElement>;
  className?: string;
};

const ELEVATION_SHADOW = {
  active: 'var(--vk-shadow-card)',
  next: 'var(--vk-shadow-card-next)',
  back: 'var(--vk-shadow-card-back)',
  lifted: 'var(--vk-shadow-card-lifted)',
} as const;

/**
 * A single question card.
 *
 * Used for the active card, the two stacked behind it, and the copy that flies
 * away when an answer is committed — hence the `inert` and `elevation` props
 * rather than four near-identical components.
 */
export function QuestionCard({
  content,
  selection,
  labels,
  onAgree,
  onDisagree,
  onToggleImportant,
  onPointerDown,
  close,
  guides,
  statementAs: Statement = 'p',
  inert = false,
  elevation = 'active',
  ref,
  className,
}: QuestionCardProps) {
  /*
   * Keyed to `onPointerDown`, which is what actually makes the card draggable —
   * not to `onAgree`, which only means its buttons work. The recap's dialog
   * renders an answerable card that is *not* on a deck, and a grab cursor over
   * something that cannot be grabbed is a promise the card can't keep.
   */
  const interactive = !inert && Boolean(onPointerDown);

  return (
    <div
      ref={ref}
      className={[
        styles.card,
        interactive ? styles.interactive : undefined,
        close ? styles.closable : undefined,
        guides ? styles.guided : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ boxShadow: ELEVATION_SHADOW[elevation] }}
      onPointerDown={onPointerDown}
      // Cards behind the active one are decoration; screen readers and the tab
      // order should only ever see the question actually being answered.
      inert={inert}
      aria-hidden={inert || undefined}
    >
      {close ? (
        <button
          type="button"
          className={styles.close}
          aria-label={close.label}
          title={close.label}
          onPointerDown={stopPropagation}
          onClick={close.onClose}
          tabIndex={inert ? -1 : undefined}
        >
          <Icon name="close" size={14} />
        </button>
      ) : null}

      {guides}

      {content.topic || content.title ? (
        <div className={styles.chips}>
          {content.topic ? <Chip variant="filled">{content.topic}</Chip> : null}
          {content.title ? <Chip variant="outline">{content.title}</Chip> : null}
        </div>
      ) : null}

      <div className={styles.body}>
        {content.statement ? (
          <Statement className={styles.statement}>{content.statement}</Statement>
        ) : null}
        {content.detail ? (
          <p className={`${styles.detail} ${content.statement ? '' : styles.detailAlone}`}>
            {content.detail}
          </p>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.action} ${styles.important}`}
          aria-pressed={selection.important}
          aria-label={labels.important}
          onPointerDown={stopPropagation}
          onClick={onToggleImportant}
          tabIndex={inert ? -1 : undefined}
        >
          <Icon name="star" size={23} filled={selection.important} />
          <span className={styles.tooltip} aria-hidden="true">
            {labels.important}
          </span>
        </button>

        <button
          type="button"
          className={`${styles.action} ${styles.answer} ${styles.agree}`}
          aria-pressed={selection.agree}
          aria-label={labels.agree}
          onPointerDown={stopPropagation}
          onClick={onAgree}
          tabIndex={inert ? -1 : undefined}
        >
          <Icon name="check" size={21} />
          <span className={styles.answerLabel}>{labels.agree}</span>
        </button>

        <button
          type="button"
          className={`${styles.action} ${styles.answer} ${styles.disagree}`}
          aria-pressed={selection.disagree}
          aria-label={labels.disagree}
          onPointerDown={stopPropagation}
          onClick={onDisagree}
          tabIndex={inert ? -1 : undefined}
        >
          <Icon name="cross" size={21} />
          <span className={styles.answerLabel}>{labels.disagree}</span>
        </button>
      </div>
    </div>
  );
}

/** Pressing a button must not also start dragging the card. */
function stopPropagation(event: ReactPointerEvent<HTMLButtonElement>) {
  event.stopPropagation();
}
