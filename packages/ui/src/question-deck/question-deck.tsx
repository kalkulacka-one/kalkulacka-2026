'use client';

import {
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  type CardSelection,
  QuestionCard,
  type QuestionCardContent,
} from '../question-card/question-card';
import { VisuallyHidden } from '../visually-hidden/visually-hidden';
import styles from './question-deck.module.css';
import {
  advanceTransform,
  type CommitSpeed,
  exitTransform,
  SPEEDS,
  type SwipeZone,
} from './swipe-physics';
import { type SwipeIntent, useSwipeDeck } from './use-swipe-deck';

export type QuestionDeckLabels = {
  agree: string;
  disagree: string;
  important: string;
  /** Compact forms for the drag hint on narrow cards, e.g. "Ano" / "Ne". */
  agreeShort: string;
  disagreeShort: string;
  skip: string;
  /** Appended to the hint when the swipe also marks the question important. */
  importantSuffix: string;
};

export type QuestionDeckProps = {
  /** The question being answered. */
  current: QuestionCardContent;
  /** Peeking out behind it, if there is one. */
  next?: QuestionCardContent;
  /** Third in the stack. Only its silhouette is visible. */
  after?: QuestionCardContent;
  selection: CardSelection;
  labels: QuestionDeckLabels;
  /** `important` reflects the star at the moment of answering. */
  onAnswer: (agree: boolean, important: boolean) => void;
  onSkip: () => void;
  onToggleImportant: () => void;
  ref?: Ref<QuestionDeckHandle>;
};

export type QuestionDeckHandle = {
  /**
   * Play the "moving on" animation for a question that is already answered.
   *
   * Driven from outside because the control that triggers it — "Další" — lives
   * in the navigation bar below the deck, not on the card.
   */
  advance: () => void;
};

type Ghost = {
  content: QuestionCardContent;
  selection: CardSelection;
  from: string;
  to: string;
  speed: CommitSpeed;
};

/**
 * The swipeable card stack.
 *
 * The card that leaves is not the card the user was touching: on commit we
 * clone it into a "ghost" layer that flies out on its own, and immediately snap
 * the real card back to centre showing the next question. That decoupling is
 * what keeps the next question interactive during the exit animation.
 */
export function QuestionDeck({
  current,
  next,
  after,
  selection,
  labels,
  onAnswer,
  onSkip,
  onToggleImportant,
  ref,
}: QuestionDeckProps) {
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [hint, setHint] = useState<SwipeIntent | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(
    (intent: SwipeIntent, speed: CommitSpeed, from: string) => {
      const { zone, important } = intent;

      setGhost({
        content: current,
        selection: {
          agree: zone === 'agree',
          disagree: zone === 'disagree',
          important: zone === 'skip' ? selection.important : important,
        },
        from,
        to: exitTransform(zone, important),
        speed,
      });

      // Screen readers get told what was recorded; the swipe itself is silent.
      setAnnouncement(
        zone === 'skip'
          ? labels.skip
          : `${zone === 'agree' ? labels.agree : labels.disagree}${
              important ? labels.importantSuffix : ''
            }`,
      );

      if (zone === 'skip') onSkip();
      else onAnswer(zone === 'agree', important);
    },
    [current, selection.important, labels, onAnswer, onSkip],
  );

  const { cardRef, nextRef, backRef, onPointerDown, isDragging, resetStack } = useSwipeDeck({
    onCommit: (swipeIntent, from) => commit(swipeIntent, 'normal', from),
    onIntentChange: setHint,
  });

  const AT_REST = 'translate(0px, 0px) rotate(0deg)';

  /** Tapping a button commits from rest, so it flies out a little slower. */
  const commitFromButton = useCallback(
    (zone: SwipeZone, important: boolean) => {
      commit({ zone, important }, 'slow', AT_REST);
      resetStack();
    },
    [commit, resetStack],
  );

  const handleAgree = useCallback(() => {
    if (selection.agree) {
      // Choosing the same answer again clears it, without leaving the card.
      onAnswer(true, selection.important);
      return;
    }
    commitFromButton('agree', selection.important);
  }, [commitFromButton, onAnswer, selection.agree, selection.important]);

  const handleDisagree = useCallback(() => {
    if (selection.disagree) {
      onAnswer(false, selection.important);
      return;
    }
    commitFromButton('disagree', selection.important);
  }, [commitFromButton, onAnswer, selection.disagree, selection.important]);

  const handleSkip = useCallback(() => {
    commit({ zone: 'skip', important: false }, 'normal', AT_REST);
    resetStack();
  }, [commit, resetStack]);

  useImperativeHandle(
    ref,
    () => ({
      advance: () => {
        // No fling: the answer is not changing, so the card just lifts away.
        setGhost({
          content: current,
          selection,
          from: AT_REST,
          to: advanceTransform(),
          speed: 'instant',
        });
        resetStack();
      },
    }),
    [current, selection, resetStack],
  );

  // Drive the ghost's flight once React has painted it at its starting point.
  useLayoutEffect(() => {
    if (!ghost) return;
    const el = ghostRef.current;
    if (!el) return;

    const { fly, fade } = SPEEDS[ghost.speed];

    el.style.transition = 'none';
    el.style.transform = ghost.from;
    el.style.opacity = '1';

    // Force a reflow so the browser treats the next assignment as a change to
    // animate rather than folding both into one paint.
    void el.offsetWidth;

    el.style.transition = `transform ${fly}s var(--vk-easing-exit), opacity ${fade}s ease-in`;
    el.style.transform = ghost.to;
    el.style.opacity = '0';

    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    ghostTimer.current = setTimeout(() => setGhost(null), fly * 1000 + 60);
  }, [ghost]);

  useEffect(
    () => () => {
      if (ghostTimer.current) clearTimeout(ghostTimer.current);
    },
    [],
  );

  // Keyboard mirrors the gestures: left/right answer, down skips, up marks
  // important — the same directions the swipes use.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // `event.target` is not always an Element (it's `window`/`document` for
      // some synthetically dispatched or unfocused-body keydowns) — guard
      // before calling an Element-only method on it.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable]')
      )
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handleAgree();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleDisagree();
          break;
        case 'ArrowDown':
          event.preventDefault();
          handleSkip();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onToggleImportant();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAgree, handleDisagree, handleSkip, onToggleImportant]);

  const cardLabels = {
    agree: labels.agree,
    disagree: labels.disagree,
    important: labels.important,
  };

  const showHint = isDragging && hint !== null;

  /*
   * While dragging, the active card previews the answer it would record —
   * matching the prototype, where the buttons themselves light up under the
   * drag rather than only the hint pill saying so. Below the zone-activation
   * threshold `hint` is null and the preview briefly clears, exactly as it
   * does in the prototype, until the drag re-crosses into a zone. "Important"
   * is the one thing that does not clear: it is an OR with the stored value so
   * a question armed by an earlier star tap stays visibly armed through a
   * drag that does not itself reach the up-swipe threshold.
   */
  const activeSelection: CardSelection = isDragging
    ? {
        agree: hint?.zone === 'agree',
        disagree: hint?.zone === 'disagree',
        important: (hint !== null && hint.zone !== 'skip' && hint.important) || selection.important,
      }
    : selection;

  return (
    <div className={styles.deck}>
      {after ? (
        <div ref={backRef} className={`${styles.layer} ${styles.back}`}>
          <div className={styles.blank} />
        </div>
      ) : null}

      {next ? (
        <div ref={nextRef} className={`${styles.layer} ${styles.next}`}>
          <QuestionCard
            content={next}
            selection={{ agree: false, disagree: false, important: false }}
            labels={cardLabels}
            elevation="next"
            inert
          />
        </div>
      ) : null}

      <QuestionCard
        ref={cardRef}
        className={styles.active}
        content={current}
        selection={activeSelection}
        labels={cardLabels}
        onPointerDown={onPointerDown}
        onAgree={handleAgree}
        onDisagree={handleDisagree}
        onToggleImportant={onToggleImportant}
      />

      {ghost ? (
        <QuestionCard
          ref={ghostRef}
          className={styles.ghost}
          content={ghost.content}
          selection={ghost.selection}
          labels={cardLabels}
          elevation="lifted"
          inert
        />
      ) : null}

      <div className={`${styles.toast} ${showHint ? styles.toastVisible : ''}`} aria-hidden="true">
        {hint ? <HintLabel intent={hint} labels={labels} /> : null}
      </div>

      {/* Announces the committed answer without moving focus. */}
      <VisuallyHidden as="output" aria-live="polite">
        {announcement}
      </VisuallyHidden>
    </div>
  );
}

function HintLabel({ intent, labels }: { intent: SwipeIntent; labels: QuestionDeckLabels }) {
  if (intent.zone === 'skip') return <span>{labels.skip}</span>;

  const long = intent.zone === 'agree' ? labels.agree : labels.disagree;
  const short = intent.zone === 'agree' ? labels.agreeShort : labels.disagreeShort;
  const suffix = intent.important ? labels.importantSuffix : '';

  return (
    <>
      <span className={styles.short}>
        {short}
        {suffix}
      </span>
      <span className={styles.long}>
        {long}
        {suffix}
      </span>
    </>
  );
}
