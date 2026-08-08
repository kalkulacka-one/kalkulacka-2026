'use client';

import { format, getMessages } from '@vk/i18n';
import { Button, type CardSelection, QuestionDeck, type QuestionDeckHandle } from '@vk/ui';
import { useCallback, useRef, useState } from 'react';
import styles from './guide-practice.module.css';
import type { PractisedGesture } from './guide-steps';
import { HelpDialog } from './help-dialog';

const messages = getMessages();

/** The four gestures the card can actually teach; the recap step is a screen. */
const GESTURES: PractisedGesture[] = ['agree', 'disagree', 'important', 'skip'];

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
 * onto question 1 having never made one. This is a real `QuestionDeck` on a
 * throwaway statement — the identical component the flow uses, so what is
 * learned here is literally the control they meet next, down to the drag
 * physics and the hint toast.
 *
 * There is deliberately no list of steps beside it. On a phone the five-item
 * version pushed the card, the counter and the primary action below the fold
 * between them; the card can teach what it means to swipe left far better than
 * a sentence can, so the sentence became the thing that gave way. The prose
 * still exists, one tap behind "Podrobný návod" and in the shell menu's help —
 * the same `HelpDialog` in both places.
 *
 * Nothing it records leaves this component: there is no calculator id and no
 * store write, so a practice swipe cannot show up in the recap.
 */
export function GuidePractice() {
  const [practised, setPractised] = useState<Set<PractisedGesture>>(() => new Set());
  const [selection, setSelection] = useState<CardSelection>(NOTHING_SELECTED);
  const [showHelp, setShowHelp] = useState(false);

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

  return (
    <div className={styles.practice}>
      <div className={`${styles.stage} ${latest === null ? styles.nudging : ''}`}>
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
      */}
      <div className={styles.status} aria-live="polite">
        <p className={`${styles.line} ${complete ? styles.lineDone : ''}`}>
          {complete
            ? messages.guide.practiceDone
            : latest === null
              ? messages.guide.practiceHint
              : FEEDBACK[latest]}
        </p>

        {latest !== null && !complete ? (
          <p className={styles.count}>
            {format(messages.guide.practiceProgress, {
              done: practised.size,
              total: GESTURES.length,
            })}
          </p>
        ) : null}
      </div>

      <div className={styles.details}>
        <Button variant="ghost" size="small" iconStart="info" onClick={() => setShowHelp(true)}>
          {messages.guide.practiceDetails}
        </Button>
      </div>

      {/* Carries the practice ticks through, so the list opened from here
          shows what has already been tried rather than a blank checklist. */}
      <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} practised={practised} />
    </div>
  );
}
