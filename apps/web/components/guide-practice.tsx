'use client';

import { format, getMessages } from '@vk/i18n';
import { Button, type CardSelection, QuestionDeck, type QuestionDeckHandle } from '@vk/ui';
import { useCallback, useRef, useState } from 'react';
import styles from './guide-practice.module.css';
import { GuideSteps, type PractisedGesture } from './guide-steps';

const messages = getMessages();

/** The four gestures the card can actually teach; the recap step is a screen. */
const GESTURES: PractisedGesture[] = ['agree', 'disagree', 'important', 'skip'];

const NOTHING_SELECTED: CardSelection = { agree: false, disagree: false, important: false };

/**
 * The practice card, and the checklist it ticks off.
 *
 * The tutorial used to describe the gestures in words and then drop the reader
 * onto question 1 having never made one. This is the same list, with a real
 * `QuestionDeck` above it on a throwaway statement — the identical component
 * the flow uses, so what is learned here is literally the control they meet
 * next, down to the drag physics and the hint toast.
 *
 * Nothing it records leaves this component: there is no calculator id and no
 * store write, so a practice swipe cannot show up in the recap.
 */
export function GuidePractice() {
  const [practised, setPractised] = useState<Set<PractisedGesture>>(() => new Set());
  const [selection, setSelection] = useState<CardSelection>(NOTHING_SELECTED);

  /**
   * Whether the reader has laid a finger on the card yet — the nudge animation
   * runs only until they have, so it teaches once instead of fidgeting for the
   * whole time the page is open.
   */
  const [touched, setTouched] = useState(false);

  const practise = useCallback((...gestures: PractisedGesture[]) => {
    setTouched(true);
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
   * a tapped "Přeskočit" is a tick appearing further down the page, while the
   * card sits there looking untouched.
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

  return (
    <div className={styles.practice}>
      <div className={`${styles.stage} ${touched ? '' : styles.nudging}`}>
        <QuestionDeck
          ref={deckRef}
          current={{
            id: 'practice',
            statement: messages.guide.practiceStatement,
            title: messages.guide.practiceTitle,
            topic: messages.guide.practiceTopic,
          }}
          selection={selection}
          labels={{
            agree: messages.flow.agree,
            disagree: messages.flow.disagree,
            agreeShort: messages.flow.agreeShort,
            disagreeShort: messages.flow.disagreeShort,
            important: messages.flow.important,
            importantSuffix: messages.flow.importantSuffix,
            skip: messages.flow.skip,
          }}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
          onToggleImportant={handleToggleImportant}
        />
      </div>

      {/*
        The flow reaches "Přeskočit" from `FlowNav`, which this screen has no
        room for — leaving the downward drag as the only way to try the fourth
        gesture, and so leaving the checklist uncompletable by anyone working
        with taps alone. The recap's question dialog puts the same control in
        the same place for the same reason.
      */}
      <div className={styles.under}>
        <Button variant="plate" size="small" iconStart="arrowDown" onClick={skipFromButton}>
          {messages.flow.skip}
        </Button>
      </div>

      {/* `aria-live` rather than a heading: the count changes under the
          reader's own hand, so it is a status, not new content. */}
      <p className={`${styles.status} ${complete ? styles.statusDone : ''}`} aria-live="polite">
        {complete
          ? messages.guide.practiceDone
          : practised.size === 0
            ? messages.guide.practiceHint
            : format(messages.guide.practiceProgress, {
                done: practised.size,
                total: GESTURES.length,
              })}
      </p>

      <GuideSteps practised={practised} />
    </div>
  );
}
