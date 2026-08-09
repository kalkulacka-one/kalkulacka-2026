'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CardSelection,
  QuestionCard,
  type QuestionCardContent,
} from '../question-card/question-card';
import { type SwipeIntent, useSwipeDeck } from '../question-deck/use-swipe-deck';
import styles from './question-dialog.module.css';

export type QuestionDialogLabels = {
  agree: string;
  disagree: string;
  important: string;
  skip: string;
  close: string;
};

export type QuestionDialogProps = {
  /** `undefined` closes it. The content stays mounted for the fade-out. */
  question?: QuestionCardContent;
  selection: CardSelection;
  labels: QuestionDialogLabels;
  onClose: () => void;
  onAnswer: (agree: boolean) => void;
  onSkip: () => void;
  onToggleImportant: () => void;
};

/** What was open, kept around through the close animation after the prop clears it. */
type Snapshot = {
  question: QuestionCardContent;
  selection: CardSelection;
  labels: QuestionDialogLabels;
};

/**
 * The full question, opened from a recap row.
 *
 * Deliberately the *same* `QuestionCard` the deck renders rather than a
 * dialog-shaped restatement of it — the recap's rows are a summary, and the
 * thing they summarise has to look like what it looked like when it was
 * answered. So this modal has no panel of its own: the card is the panel,
 * with a classic corner close on it (the one thing the deck's cards never
 * need), and a skip control that appears under it only when there is
 * something to skip — see `attentionSkip` below.
 *
 * Built on the platform's `<dialog>` for the same reasons `Dialog` is — focus
 * trapping, Escape, inertness and the top layer are the browser's job.
 */
export function QuestionDialog({
  question,
  selection,
  labels,
  onClose,
  onAnswer,
  onSkip,
  onToggleImportant,
}: QuestionDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  // Kept alive past `question` going undefined so the card has something to
  // fade out with instead of vanishing the instant the parent clears it.
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (question) setSnapshot({ question, selection, labels });
  }, [question, selection, labels]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `snapshot` deliberately excluded — this only reacts to `question` arriving or leaving, not to the snapshot the other effect just wrote.
  useEffect(() => {
    if (question) {
      setClosing(false);
      return;
    }
    if (snapshot) setClosing(true);
  }, [question]);

  // The animation, not a timer, decides when the fade-out is actually done —
  // so `prefers-reduced-motion`'s near-zero duration still resolves promptly
  // instead of the dialog sitting invisible-but-mounted for a fixed delay.
  useEffect(() => {
    if (!closing) return;
    const shell = shellRef.current;
    if (!shell) {
      setSnapshot(undefined);
      setClosing(false);
      return;
    }
    const handle = () => {
      setSnapshot(undefined);
      setClosing(false);
    };
    shell.addEventListener('animationend', handle, { once: true });
    return () => shell.removeEventListener('animationend', handle);
  }, [closing]);

  /**
   * Re-tapping the current answer clears it — an edit that leaves the question
   * unanswered right as someone is looking at it, so "Přeskočit" gets a nudge
   * toward it. Reset whenever a different question opens, so the highlight
   * never survives to the next card.
   */
  const [attentionSkip, setAttentionSkip] = useState(false);
  const prevSelectionRef = useRef(selection);

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on `question?.id` alone — this resets on a *different* question opening, not on every selection change.
  useEffect(() => {
    prevSelectionRef.current = selection;
    setAttentionSkip(false);
  }, [question?.id]);

  useEffect(() => {
    const prev = prevSelectionRef.current;
    const hadAnswer = prev.agree || prev.disagree;
    const hasAnswer = selection.agree || selection.disagree;
    if (hadAnswer && !hasAnswer) setAttentionSkip(true);
    else if (hasAnswer) setAttentionSkip(false);
    prevSelectionRef.current = selection;
  }, [selection]);

  /**
   * The same drag a question in the deck gets — left/right answers, down
   * skips, an upward flick arms "pro mě důležité". `useSwipeDeck` is written
   * for a three-card stack, but its `next`/`back` refs are simply never
   * attached here: every write to them is already guarded internally, so a
   * single-card modal is just the stack with two of its layers absent.
   *
   * On a successful drag the hook itself snaps the real card back to centre
   * right after `onCommit` runs — there is no "next card" underneath to
   * reveal here, so the existing close animation (triggered by the answer
   * clearing `question` upstream) is what actually carries the card away,
   * exactly as it does for a tap on the same buttons.
   */
  const handleCommit = useCallback(
    (commitIntent: SwipeIntent) => {
      if (commitIntent.zone === 'skip') {
        onSkip();
        return;
      }
      if (commitIntent.important && !selection.important) onToggleImportant();
      onAnswer(commitIntent.zone === 'agree');
    },
    [onAnswer, onSkip, onToggleImportant, selection.important],
  );

  const { cardRef, onPointerDown, isDragging, intent } = useSwipeDeck({
    onCommit: handleCommit,
    disabled: closing,
  });

  const visible = snapshot !== undefined;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (visible && !dialog.open) dialog.showModal();
    if (!visible && dialog.open) dialog.close();
  }, [visible]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // Anything that closes the element without going through `onClose` — a
    // browser-initiated dismissal, say — still has to reach the owner, or the
    // state would say open while the element is shut and it could never
    // reopen.
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-closing={closing || undefined}
      aria-label={snapshot?.question.title}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      /*
       * Escape is routed through React rather than left to the element, so
       * that every dismissal takes the same path through the owner's state
       * (see `dialog.tsx` for the failure this avoids). The arrow keys mirror
       * the deck's own shortcuts (`question-deck.tsx`) — left/right answer,
       * down skips, up arms "pro mě důležité" — scoped to this element rather
       * than a window listener because native focus-trapping already means
       * they only reach here while the dialog is actually open.
       */
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return;
        }
        if (!snapshot || event.metaKey || event.ctrlKey || event.altKey) return;

        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            onAnswer(true);
            break;
          case 'ArrowRight':
            event.preventDefault();
            onAnswer(false);
            break;
          case 'ArrowDown':
            event.preventDefault();
            onSkip();
            break;
          case 'ArrowUp':
            event.preventDefault();
            onToggleImportant();
            break;
          default:
            break;
        }
      }}
    >
      {snapshot ? (
        <div ref={shellRef} className={`${styles.shell} ${closing ? styles.closing : ''}`}>
          <div className={styles.stage}>
            <QuestionCard
              ref={cardRef}
              content={snapshot.question}
              selection={snapshot.selection}
              labels={snapshot.labels}
              /* Second level, not first: this opens over the recap, whose own
                 `<h1>` names the screen the reader is still on. */
              statementAs="h2"
              elevation="lifted"
              close={{ label: snapshot.labels.close, onClose }}
              onPointerDown={onPointerDown}
              onAgree={() => onAnswer(true)}
              onDisagree={() => onAnswer(false)}
              onToggleImportant={onToggleImportant}
            />

            {/* Mirrors the deck's own drag hint — what releasing now would do. */}
            <div className={`${styles.toast} ${isDragging && intent ? styles.toastVisible : ''}`}>
              {intent
                ? intent.zone === 'skip'
                  ? snapshot.labels.skip
                  : `${intent.zone === 'agree' ? snapshot.labels.agree : snapshot.labels.disagree}`
                : null}
            </div>
          </div>

          {/*
            Only appears right after re-tapping the current answer clears it —
            the one moment "Přeskočit" is actually the next move rather than
            just another way to leave. Opening an already-open question (one
            that's still unanswered from before) offers no skip button at all:
            there is nothing new here to skip.
          */}
          {attentionSkip ? (
            <div className={styles.under}>
              <button type="button" className={styles.skip} onClick={onSkip}>
                {snapshot.labels.skip}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
