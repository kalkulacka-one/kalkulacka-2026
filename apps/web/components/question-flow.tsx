'use client';

import { type Question, toSegments } from '@vk/core';
import { format, getMessages } from '@vk/i18n';
import {
  FlowNav,
  KeyboardHints,
  ProgressSegments,
  QuestionDeck,
  type QuestionDeckHandle,
  VisuallyHidden,
} from '@vk/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnswersStore, useCalculatorAnswers } from '../lib/answers-store';
import { type CalculatorShellInfo, questionPath, stepPath } from '../lib/paths';
import { toCardContent } from '../lib/question-content';
import { AppShell } from './app-shell';
import styles from './question-flow.module.css';

export type QuestionFlowProps = {
  calculator: CalculatorShellInfo;
  questions: Question[];
  /** 1-based, from the URL. */
  initialPosition: number;
};

const messages = getMessages();

export function QuestionFlow({ calculator, questions, initialPosition }: QuestionFlowProps) {
  const { id: calculatorId, electionKey, district, embed } = calculator;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialPosition - 1, 0), questions.length - 1),
  );

  /**
   * True right after re-tapping the current answer clears it — a nudge toward
   * "Přeskočit" for the moment the question is unexpectedly unanswered again.
   * Reset whenever the question itself changes, so it never survives to the
   * next card.
   */
  const [justCleared, setJustCleared] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally keyed on `index` alone — this only resets on card change, nothing inside it reads `index`.
  useEffect(() => setJustCleared(false), [index]);

  /**
   * True from the moment the last question's commit pushes toward the recap
   * until this screen unmounts. The push is asynchronous — an RSC round-trip,
   * or in dev a compile — and without this flag the deck sits fully live in
   * the meantime: its ghost design snaps the same card back after the exit
   * animation, so a slow navigation read as "question 42 can be answered
   * forever", each answer firing another push.
   */
  const [leaving, setLeaving] = useState(false);

  const answers = useCalculatorAnswers(calculatorId);
  const setAnswer = useAnswersStore((s) => s.setAnswer);
  const skipQuestion = useAnswersStore((s) => s.skipQuestion);
  const toggleImportant = useAnswersStore((s) => s.toggleImportant);

  const question = questions[index];

  /*
   * The URL tracks the question so a refresh or a shared link lands in the
   * right place — but via replaceState rather than a router push. Routing on
   * every answer would put a navigation between the swipe and the next card,
   * which is exactly the latency this interaction cannot afford.
   */
  useEffect(() => {
    const path = questionPath({ electionKey, district, embed }, index + 1);
    window.history.replaceState(null, '', path);
  }, [electionKey, district, embed, index]);

  const deckRef = useRef<QuestionDeckHandle>(null);
  const router = useRouter();

  /*
   * The two `router.push` exits from this screen, warmed on mount.
   * A push, unlike a viewport-visible `<Link>`, prefetches nothing — so
   * without this the last card flies away and the flow then sits on a
   * full RSC round-trip before the recap paints, dead air the user reads
   * as lag. (No-op in dev, where prefetching is disabled — dev's
   * first-navigation stalls are compilation, not this.)
   */
  useEffect(() => {
    router.prefetch(stepPath({ electionKey, district, embed }, 'review'));
    router.prefetch(stepPath({ electionKey, district, embed }, 'guide'));
  }, [router, electionKey, district, embed]);

  /**
   * Move on — and off the end of the deck into the recap.
   *
   * The last card advancing to itself would leave someone stuck on question 42
   * with a "Další" that does nothing, so the deck's end is the recap's entrance.
   */
  const advance = useCallback(() => {
    if (leaving) return;
    if (index + 1 >= questions.length) {
      setLeaving(true);
      router.push(stepPath({ electionKey, district, embed }, 'review'));
      return;
    }
    setIndex(index + 1);
  }, [district, electionKey, embed, index, leaving, questions.length, router]);

  /**
   * Back one card — and, from the first one, back to the tutorial.
   *
   * Question 1 used to carry a dead "Předchozí": the one place in the flow
   * where the control is visible but does nothing, shown to exactly the people
   * least sure of what they are doing. The screen behind question 1 is the
   * návod, so that is where the back control goes, named for the place it
   * returns to like every other back link in the app.
   */
  const goToPrevious = useCallback(() => {
    if (leaving) return;
    if (index === 0) {
      router.push(stepPath({ electionKey, district, embed }, 'guide'));
      return;
    }
    setIndex((i) => Math.max(i - 1, 0));
  }, [district, electionKey, embed, index, leaving, router]);

  /**
   * Lifts the card away without writing to the answer store — used both by
   * "Další" on an already-answered question and by the browse-only shortcut,
   * which must never record anything even on an unanswered one.
   */
  const advanceAnimated = useCallback(() => {
    deckRef.current?.advance();
    advance();
  }, [advance]);

  const handleAnswer = useCallback(
    (agree: boolean, important: boolean) => {
      if (leaving || !question) return;

      const existing = answers[question.id];
      const isClearing = existing?.answer === agree;

      setAnswer(calculatorId, question.id, agree);
      if (important && !existing?.isImportant) toggleImportant(calculatorId, question.id);

      // Re-choosing the same answer clears it; that is an edit, not progress.
      setJustCleared(isClearing);
      if (!isClearing) advance();
    },
    [advance, answers, calculatorId, leaving, question, setAnswer, toggleImportant],
  );

  const handleSkip = useCallback(() => {
    if (leaving || !question) return;
    skipQuestion(calculatorId, question.id);
    advance();
  }, [advance, calculatorId, leaving, question, skipQuestion]);

  const handleToggleImportant = useCallback(() => {
    if (!question) return;
    toggleImportant(calculatorId, question.id);
  }, [calculatorId, question, toggleImportant]);

  /*
   * `,` / `.` browse without touching the answer store — deliberately not
   * modifier keys on the existing arrows. Shift+Arrow already means "extend
   * a text selection" to the browser and some screen readers, which is
   * exactly the wrong association for a shortcut whose entire point is "this
   * one is safe, it changes nothing." Mirrors the nav buttons: `,` is
   * identical to Předchozí, `.` is the store-write-free half of Další.
   */
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

      if (event.key === ',') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === '.') {
        event.preventDefault();
        advanceAnimated();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goToPrevious, advanceAnimated]);

  /**
   * The card that just landed, spoken.
   *
   * Answering leaves focus on the control that was pressed while the card's
   * content is replaced underneath it, so a reader working by keyboard hears
   * the deck confirm their own answer ("Souhlasím") and is then told nothing
   * whatsoever about the question they have arrived at — the one thing on the
   * screen that changed. Polite, so it queues behind that confirmation and the
   * two read in the order they happened.
   *
   * Empty until the first move: on arrival the question is simply part of the
   * page, and a live region that speaks its own initial contents would read
   * the card out a second time.
   */
  const [landed, setLanded] = useState('');
  const settledRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `index` is the trigger; the rest is read at the moment it changes rather than driving this.
  useEffect(() => {
    if (!settledRef.current) {
      settledRef.current = true;
      return;
    }

    const landedQuestion = questions[index];
    if (!landedQuestion) return;

    setLanded(
      `${format(messages.flow.questionCounter, {
        position: index + 1,
        total: questions.length,
      })} ${landedQuestion.statement}`,
    );
  }, [index]);

  if (!question) return null;

  const answer = answers[question.id];
  const segments = toSegments(questions, answers);
  const isAnswered = answer?.answer !== undefined;
  const isSkipped = answer?.skipped === true;

  const counterLabel = format(messages.flow.questionCounter, {
    position: index + 1,
    total: questions.length,
  });

  return (
    <AppShell calculator={calculator}>
      {/* The flow's own landmark. It was the one screen in the app whose
          content sat in a bare `<div>`, so "jump to the main content" — the
          first thing a screen-reader user does on any page — had nowhere to
          land on the forty-two screens they spend the longest on. */}
      <main className={styles.flow}>
        <div className={styles.progress}>
          <ProgressSegments
            segments={segments}
            currentIndex={index}
            label={messages.flow.progressLabel}
          />
        </div>

        <div className={styles.center}>
          <div className={styles.stage}>
            <QuestionDeck
              ref={deckRef}
              current={toCardContent(question)}
              next={
                questions[index + 1] ? toCardContent(questions[index + 1] as Question) : undefined
              }
              after={
                questions[index + 2] ? toCardContent(questions[index + 2] as Question) : undefined
              }
              selection={{
                agree: answer?.answer === true,
                disagree: answer?.answer === false,
                important: answer?.isImportant === true,
              }}
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
              finished={leaving}
            />
          </div>

          <FlowNav
            position={index + 1}
            total={questions.length}
            canGoBack
            onPrevious={goToPrevious}
            onForward={isAnswered ? advanceAnimated : handleSkip}
            previousLabel={index === 0 ? messages.flow.guide : messages.flow.previous}
            forwardLabel={isAnswered ? messages.flow.next : messages.flow.skip}
            isSkipped={isSkipped}
            attention={justCleared}
            counterLabel={counterLabel}
          />

          {/*
            Left and right get a hint each rather than one shared "odpovědět":
            which arrow means "souhlasím" is the one thing about this shortcut
            a first-time user cannot guess, and the paired row also matches
            the left/right order of the answer buttons on the card.
          */}
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
              {
                keys: [
                  { icon: 'comma', label: messages.flow.keyComma },
                  { icon: 'period', label: messages.flow.keyPeriod },
                ],
                label: messages.flow.shortcutBrowse,
              },
            ]}
          />

          <VisuallyHidden as="output" aria-live="polite">
            {landed}
          </VisuallyHidden>
        </div>
      </main>
    </AppShell>
  );
}
