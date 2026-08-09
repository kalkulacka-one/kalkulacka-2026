'use client';

import { format, getMessages } from '@vk/i18n';
import {
  Button,
  type CardSelection,
  type DragDirection,
  KeyboardHints,
  QuestionDeck,
  type QuestionDeckHandle,
} from '@vk/ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import { usePointerKind } from '../lib/use-pointer-kind';
import styles from './guide-practice.module.css';
import type { PractisedGesture } from './guide-steps';

const messages = getMessages();

/** The four gestures the card can actually teach; the recap step is a screen. */
const GESTURES: PractisedGesture[] = ['agree', 'disagree', 'important', 'skip'];

/**
 * Which arrows on the card's compass a gesture accounts for.
 *
 * "Important" claims both diagonals: they are the same lift, applied to
 * whichever answer the drag was already heading for, so having done one there
 * is nothing left to discover about the other.
 */
const DIRECTIONS_FOR: Record<PractisedGesture, DragDirection[]> = {
  agree: ['w'],
  disagree: ['e'],
  important: ['nw', 'ne'],
  skip: ['s'],
};

/** What each gesture means, said at the moment it is made. */
const FEEDBACK: Record<PractisedGesture, string> = {
  agree: messages.guide.feedbackAgree,
  disagree: messages.guide.feedbackDisagree,
  important: messages.guide.feedbackImportant,
  skip: messages.guide.feedbackSkip,
};

const NOTHING_SELECTED: CardSelection = { agree: false, disagree: false, important: false };

/**
 * The practice card, and the running commentary that teaches from it.
 *
 * The tutorial used to describe the gestures in words and then drop the reader
 * onto question 1 having never made one. This is a real `QuestionDeck` with a
 * throwaway card on it — the identical component the flow uses, so what is
 * learned here is literally the control they meet next, down to the drag
 * physics and the hint toast.
 *
 * There is deliberately no list of steps beside it. On a phone the five-item
 * version pushed the card, the counter and the primary action below the fold
 * between them; the card can teach what it means to swipe left far better than
 * a sentence can, so the sentence became the thing that gave way. The prose
 * still exists, one tap behind the shell menu's help — same `HelpDialog`,
 * reachable everywhere in the flow, not just here.
 *
 * Nothing it records leaves this component: there is no calculator id and no
 * store write, so a practice swipe cannot show up in the recap.
 */
export function GuidePractice() {
  const [practised, setPractised] = useState<Set<PractisedGesture>>(() => new Set());
  const [selection, setSelection] = useState<CardSelection>(NOTHING_SELECTED);

  /**
   * The gesture just made, which the status line explains. Separate from the
   * practised set because it is about *recency*, not coverage — trying agree a
   * second time should say so again, even though nothing new was learned.
   */
  const [latest, setLatest] = useState<PractisedGesture | null>(null);

  const practise = useCallback((...gestures: PractisedGesture[]) => {
    // The first one named is the one the status line reports: an upward flick
    // that also answers is an answer, with important along for the ride.
    setLatest(gestures[0] ?? null);
    setPractised((current) => {
      if (gestures.every((gesture) => current.has(gesture))) return current;
      const next = new Set(current);
      for (const gesture of gestures) next.add(gesture);
      return next;
    });
  }, []);

  /*
   * The card resets to unanswered after every commit rather than staying
   * selected. There is only ever this one card, so leaving it marked would end
   * the practice after a single swipe — snapping back to neutral is what makes
   * it a card you can keep trying things on.
   */
  const handleAnswer = useCallback(
    (agree: boolean, important: boolean) => {
      if (important) practise(agree ? 'agree' : 'disagree', 'important');
      else practise(agree ? 'agree' : 'disagree');
      setSelection(NOTHING_SELECTED);
    },
    [practise],
  );

  const handleSkip = useCallback(() => {
    practise('skip');
    setSelection(NOTHING_SELECTED);
  }, [practise]);

  /**
   * The button below the card, which the deck knows nothing about — so the
   * card has to be told to lift away by hand. Without it the only feedback for
   * a tapped "Přeskočit" is a line of text changing under it.
   */
  const deckRef = useRef<QuestionDeckHandle>(null);
  const skipFromButton = useCallback(() => {
    deckRef.current?.advance();
    handleSkip();
  }, [handleSkip]);

  const handleToggleImportant = useCallback(() => {
    practise('important');
    setSelection((current) => ({ ...current, important: !current.important }));
  }, [practise]);

  const complete = GESTURES.every((gesture) => practised.has(gesture));

  /*
   * Finger or mouse, which is the whole difference between the two tutorials
   * this screen can be. A phone is taught the gesture and told to tap; a
   * desktop keeps the gesture — dragging with a mouse works — but is also shown
   * the keyboard row it will have under the real flow, and is told to click.
   */
  const pointer = usePointerKind();

  const practisedDirections = useMemo(() => {
    const directions = new Set<DragDirection>();
    for (const gesture of practised) {
      for (const direction of DIRECTIONS_FOR[gesture]) directions.add(direction);
    }
    return directions;
  }, [practised]);

  return (
    <div className={styles.practice}>
      <div className={`${styles.stage} ${latest === null ? styles.nudging : ''}`}>
        <QuestionDeck
          ref={deckRef}
          /*
            No statement, no chips: there is nothing here to agree or disagree
            with, and a headline saying so ("Vyzkoušejte si gesta.") only
            repeated what the screen's own description already says. Dropping
            "Cvičná otázka" / "Nanečisto" too — a real question's chips carry
            information (topic, difficulty); this card's only ever said "this
            is practice" twice, once in the screen title above it, and cost the
            card a whole row to do it. The card's one line is the instruction
            for using it, now the only text on the card.
          */
          current={{
            id: 'practice',
            detail:
              pointer === 'mouse'
                ? messages.guide.practiceBodyPointer
                : messages.guide.practiceBodyTouch,
          }}
          selection={selection}
          labels={{
            agree: messages.flow.agree,
            disagree: messages.flow.disagree,
            important: messages.flow.important,
            importantSuffix: messages.flow.importantSuffix,
            skip: messages.flow.skip,
          }}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
          onToggleImportant={handleToggleImportant}
          dragGuides={{ practised: practisedDirections, split: pointer === 'mouse' }}
        />
      </div>

      {/*
        The flow reaches "Přeskočit" from `FlowNav`, which this screen has no
        room for — leaving the downward drag as the only way to try the fourth
        gesture, and so leaving it out of reach of anyone working with taps
        alone. The recap's question dialog puts the same control in the same
        place for the same reason.
      */}
      <div className={styles.under}>
        <Button variant="plate" size="small" iconStart="arrowDown" onClick={skipFromButton}>
          {messages.flow.skip}
        </Button>
      </div>

      {/*
        This is the teaching surface now that the step list is gone: it names
        the gesture just made *and* what it does, at the moment the reader's
        own hand made it. `aria-live` rather than a heading — the text changes
        under them, so it is a status, not new content.

        Nothing to say before the first gesture: the "how to drag this" line
        that used to sit here now lives on the card itself, where the hand
        already is, and repeating it under the card would be the same sentence
        twice on one screen.

        The feedback line does not retire once practice is complete — it stays
        and "Máte to v ruce" joins it as a second line rather than replacing
        it. The last thing the reader's hand did is still the most recent fact
        on the screen; losing it the instant the count hits four would make the
        one gesture that happened to finish the set the one gesture the status
        line stays silent about.
      */}
      <div className={styles.status} aria-live="polite">
        {latest !== null ? <p className={styles.line}>{FEEDBACK[latest]}</p> : null}

        {complete ? (
          <p className={`${styles.line} ${styles.lineDone}`}>{messages.guide.practiceDone}</p>
        ) : (
          <p className={styles.count}>
            {format(messages.guide.practiceProgress, {
              done: practised.size,
              total: GESTURES.length,
            })}
          </p>
        )}
      </div>

      {/*
        The same shortcut row the flow carries, on the screen that is meant to
        teach it — a desktop reader who learns the arrows here never has to
        discover them mid-questionnaire. Touch gets nothing: there is no
        keyboard to press, and the gestures are what the arrows on the card and
        the line above are already teaching.
      */}
      {pointer === 'mouse' ? (
        <KeyboardHints
          hints={[
            {
              keys: [{ icon: 'arrowLeft', label: messages.flow.keyArrowLeft }],
              label: messages.flow.shortcutAgree,
            },
            {
              keys: [{ icon: 'arrowRight', label: messages.flow.keyArrowRight }],
              label: messages.flow.shortcutDisagree,
            },
            {
              keys: [{ icon: 'arrowUp', label: messages.flow.keyArrowUp }],
              label: messages.flow.shortcutImportant,
            },
            {
              keys: [{ icon: 'arrowDown', label: messages.flow.keyArrowDown }],
              label: messages.flow.shortcutSkip,
            },
          ]}
        />
      ) : null}
    </div>
  );
}
