'use client';

import { type Question, questionPath, toSegments } from '@vk/core';
import { format, getMessages } from '@vk/i18n';
import {
  Backdrop,
  FlowNav,
  KeyboardHints,
  Logo,
  ProgressSegments,
  type QuestionCardContent,
  QuestionDeck,
  type QuestionDeckHandle,
} from '@vk/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnswersStore, useCalculatorAnswers } from '../lib/answers-store';
import styles from './question-flow.module.css';

export type QuestionFlowProps = {
  calculatorId: string;
  calculatorName: string;
  electionName: string;
  electionKey: string;
  district: string;
  questions: Question[];
  /** 1-based, from the URL. */
  initialPosition: number;
};

const messages = getMessages();

function toCardContent(question: Question): QuestionCardContent {
  return {
    id: question.id,
    statement: question.statement,
    title: question.title,
    detail: question.detail,
    topic: question.tags[0],
  };
}

export function QuestionFlow({
  calculatorId,
  calculatorName,
  electionName,
  electionKey,
  district,
  questions,
  initialPosition,
}: QuestionFlowProps) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialPosition - 1, 0), questions.length - 1),
  );

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
    const path = questionPath({ electionKey, district }, index + 1);
    window.history.replaceState(null, '', path);
  }, [electionKey, district, index]);

  const deckRef = useRef<QuestionDeckHandle>(null);

  const advance = useCallback(() => {
    setIndex((i) => Math.min(i + 1, questions.length - 1));
  }, [questions.length]);

  const goToPrevious = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

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
      if (!question) return;

      const existing = answers[question.id];
      const isClearing = existing?.answer === agree;

      setAnswer(calculatorId, question.id, agree);
      if (important && !existing?.isImportant) toggleImportant(calculatorId, question.id);

      // Re-choosing the same answer clears it; that is an edit, not progress.
      if (!isClearing) advance();
    },
    [advance, answers, calculatorId, question, setAnswer, toggleImportant],
  );

  const handleSkip = useCallback(() => {
    if (!question) return;
    skipQuestion(calculatorId, question.id);
    advance();
  }, [advance, calculatorId, question, skipQuestion]);

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
    <div className={styles.flow}>
      {/* Behind everything below: the backdrop is theme-controlled and off by default. */}
      <Backdrop />

      <div className={styles.content}>
        <header className={styles.header}>
          <Logo size={12} className={styles.logo} />
          <div>
            <p className={styles.brand}>{messages.app.title}</p>
            <p className={styles.subtitle}>
              {calculatorName} · {electionName}
            </p>
          </div>
        </header>

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

          <FlowNav
            position={index + 1}
            total={questions.length}
            canGoBack={index > 0}
            onPrevious={goToPrevious}
            onForward={isAnswered ? advanceAnimated : handleSkip}
            previousLabel={messages.flow.previous}
            forwardLabel={isAnswered ? messages.flow.next : messages.flow.skip}
            isSkipped={isSkipped}
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
        </div>
      </div>
    </div>
  );
}
