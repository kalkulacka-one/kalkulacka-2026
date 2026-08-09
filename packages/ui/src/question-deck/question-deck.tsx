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
import { type DragDirection, DragGuides } from '../drag-guides/drag-guides';
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
  type SwipeZone,
  speedFor,
} from './swipe-physics';
import { type SwipeIntent, useSwipeDeck } from './use-swipe-deck';

export type QuestionDeckLabels = {
  agree: string;
  disagree: string;
  important: string;
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
  /**
   * Draw the direction compass over the card. The tutorial's practice deck
   * passes it; the flow does not, where the arrows would be permanent furniture
   * over every one of forty questions.
   */
  dragGuides?: { practised?: ReadonlySet<DragDirection>; split?: boolean };
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
  dragGuides,
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

  const { cardRef, nextRef, backRef, onPointerDown, isDragging, animateStackRise } = useSwipeDeck({
    onCommit: (swipeIntent, from) => commit(swipeIntent, 'normal', from),
    onIntentChange: setHint,
  });

  const AT_REST = 'translate(0px, 0px) rotate(0deg)';

  /** Tapping a button commits from rest, so it flies out a little slower. */
  const commitFromButton = useCallback(
    (zone: SwipeZone, important: boolean) => {
      commit({ zone, important }, 'slow', AT_REST);
      animateStackRise('slow');
    },
    [commit, animateStackRise],
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
    animateStackRise('normal');
  }, [commit, animateStackRise]);

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
        animateStackRise('instant');
      },
    }),
    [current, selection, animateStackRise],
  );

  // Drive the ghost's flight once React has painted it at its starting point.
  useLayoutEffect(() => {
    if (!ghost) return;
    const el = ghostRef.current;
    if (!el) return;

    // Reduced motion collapses both to near-zero: the answered card is simply
    // gone rather than thrown off the side of the screen, which is the single
    // largest movement in the app and the one this preference exists for.
    const { fly, fade } = speedFor(ghost.speed);

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
        /* The one card on the deck that is being read, so its statement is the
           screen's heading. The layers behind it and the ghost in front are
           `inert` and out of the accessibility tree entirely, so this never
           puts a second `<h1>` in front of anyone. */
        statementAs="h1"
        onPointerDown={onPointerDown}
        onAgree={handleAgree}
        onDisagree={handleDisagree}
        onToggleImportant={onToggleImportant}
        guides={
          dragGuides ? (
            <DragGuides
              labels={labels}
              split={dragGuides.split}
              practised={dragGuides.practised}
              active={showHint ? directionForIntent(hint) : null}
            />
          ) : undefined
        }
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

/**
 * Which arrow the drag is currently pointing at.
 *
 * Read from the same intent the hint toast uses, so the compass and the toast
 * can never disagree about what releasing right now would do.
 */
function directionForIntent(intent: SwipeIntent | null): DragDirection | null {
  if (!intent) return null;
  if (intent.zone === 'skip') return 's';
  if (intent.zone === 'agree') return intent.important ? 'nw' : 'w';
  return intent.important ? 'ne' : 'e';
}

/**
 * What releasing right now would record.
 *
 * Always the full "Souhlasím" / "Nesouhlasím", never the compact "Ano" / "Ne"
 * it used to shrink to on a narrow deck. The toast is the only place in the
 * flow those two answers went by a different name — the card's own buttons,
 * the keyboard hints, the recap and the results all say the long form — and a
 * control that renames itself at the moment of committing is teaching the
 * reader a synonym they never asked for.
 */
function HintLabel({ intent, labels }: { intent: SwipeIntent; labels: QuestionDeckLabels }) {
  if (intent.zone === 'skip') return <span>{labels.skip}</span>;

  const answer = intent.zone === 'agree' ? labels.agree : labels.disagree;

  return (
    <span>
      {answer}
      {intent.important ? labels.importantSuffix : ''}
    </span>
  );
}
