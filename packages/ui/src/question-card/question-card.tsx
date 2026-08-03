import type { PointerEvent as ReactPointerEvent, Ref } from 'react';
import { Chip } from '../chip/chip';
import { Icon } from '../icon/icon';
import styles from './question-card.module.css';

/** Everything the card needs to render one question. */
export type QuestionCardContent = {
  id: string;
  /** The statement being agreed or disagreed with. */
  statement: string;
  /** Short label for the outlined chip. */
  title: string;
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

      <div className={styles.chips}>
        {content.topic ? <Chip variant="filled">{content.topic}</Chip> : null}
        <Chip variant="outline">{content.title}</Chip>
      </div>

      <div className={styles.body}>
        <p className={styles.statement}>{content.statement}</p>
        {content.detail ? <p className={styles.detail}>{content.detail}</p> : null}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.action} ${styles.important}`}
          aria-pressed={selection.important}
          aria-label={labels.important}
          title={labels.important}
          onPointerDown={stopPropagation}
          onClick={onToggleImportant}
          tabIndex={inert ? -1 : undefined}
        >
          <Icon name="star" size={23} filled={selection.important} />
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
