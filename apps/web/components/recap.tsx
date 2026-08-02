'use client';

import { countAnswered, countSkipped, type Question } from '@vk/core';
import { format, getMessages } from '@vk/i18n';
import { Button, RecapItem, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAnswersReady, useAnswersStore, useCalculatorAnswers } from '../lib/answers-store';
import { type CalculatorRef, questionPath, stepPath } from '../lib/paths';
import styles from './recap.module.css';
import { Screen } from './screen';

export type RecapProps = {
  calculatorId: string;
  calculatorName: string;
  electionName: string;
  questions: Question[];
} & CalculatorRef;

const messages = getMessages();

/**
 * Every question at once, still answerable.
 *
 * Edits go straight to the same store the deck writes to, so this is a second
 * view of the answers rather than a copy — there is no "save" step and no way
 * for the two screens to disagree.
 */
export function Recap({
  calculatorId,
  calculatorName,
  electionName,
  electionKey,
  district,
  questions,
}: RecapProps) {
  const router = useRouter();
  const ready = useAnswersReady();
  const answers = useCalculatorAnswers(calculatorId);
  const setAnswer = useAnswersStore((s) => s.setAnswer);
  const toggleImportant = useAnswersStore((s) => s.toggleImportant);

  const ref = { electionKey, district };
  const answered = countAnswered(answers);
  const skipped = countSkipped(answers);
  const remaining = questions.length - answered - skipped;

  return (
    <Screen
      calculatorName={calculatorName}
      electionName={electionName}
      calculator={{ id: calculatorId, ...ref }}
      title={messages.recap.title}
      description={messages.recap.description}
      back={{ href: questionPath(ref, questions.length), label: messages.recap.backToQuestions }}
      footer={
        <StickyBar>
          {/*
            With nothing answered there is nothing to compare, so the control is
            a genuinely disabled button rather than a link wearing
            `aria-disabled` — which would still navigate on click.
          */}
          {ready && answered === 0 ? (
            <Button size="large" disabled>
              {messages.recap.showResults}
            </Button>
          ) : (
            <Button as={Link} href={stepPath(ref, 'result')} size="large">
              {messages.recap.showResults}
            </Button>
          )}
        </StickyBar>
      }
    >
      <p className={styles.summary}>
        <span className={styles.count}>
          {format(messages.recap.summary, { answered, total: questions.length })}
        </span>
        {skipped > 0 ? (
          <span className={styles.muted}>{format(messages.recap.skippedSummary, { skipped })}</span>
        ) : null}
        {remaining > 0 ? (
          <span className={styles.muted}>{format(messages.recap.remaining, { remaining })}</span>
        ) : null}
      </p>

      <ul className={styles.list}>
        {questions.map((question, index) => {
          const answer = answers[question.id];

          return (
            <RecapItem
              key={question.id}
              position={index + 1}
              statement={question.statement}
              title={question.title}
              topic={question.tags[0]}
              agree={answer?.answer === true}
              disagree={answer?.answer === false}
              important={answer?.isImportant === true}
              skipped={answer?.skipped === true}
              labels={{
                agree: messages.flow.agreeShort,
                disagree: messages.flow.disagreeShort,
                important: messages.flow.important,
                skipped: messages.recap.skipped,
                open: format(messages.recap.open, { position: index + 1 }),
              }}
              onAnswer={(agree) => setAnswer(calculatorId, question.id, agree)}
              onToggleImportant={() => toggleImportant(calculatorId, question.id)}
              onOpen={() => router.push(questionPath(ref, index + 1))}
            />
          );
        })}
      </ul>
    </Screen>
  );
}
