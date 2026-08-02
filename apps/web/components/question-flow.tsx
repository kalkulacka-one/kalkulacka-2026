'use client';

import { type Question, questionPath, toSegments } from '@vk/core';
import { format, getMessages } from '@vk/i18n';
import {
  Backdrop,
  FlowNav,
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

  /** "Další" — the answer stands, so the card lifts away rather than flying. */
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

  if (!question) return null;

  const answer = answers[question.id];
  const segments = toSegments(questions, answers);
  const isAnswered = answer?.answer !== undefined;
  const isSkipped = answer !== undefined && answer.answer === undefined;

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
            onPrevious={() => setIndex((i) => Math.max(i - 1, 0))}
            onForward={isAnswered ? advanceAnimated : handleSkip}
            previousLabel={messages.flow.previous}
            forwardLabel={isAnswered ? messages.flow.next : messages.flow.skip}
            isSkipped={isSkipped}
            counterLabel={counterLabel}
          />
        </div>
      </div>
    </div>
  );
}
