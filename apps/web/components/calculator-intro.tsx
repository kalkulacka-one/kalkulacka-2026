'use client';

import { countAnswered, firstUnansweredIndex, type Question } from '@vk/core';
import { format, getMessages, plural } from '@vk/i18n';
import { Button, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAnswersReady, useAnswersStore, useCalculatorAnswers } from '../lib/answers-store';
import { type CalculatorRef, electionPath, questionPath, stepPath } from '../lib/paths';
import styles from './calculator-intro.module.css';
import { RestartDialog } from './restart-dialog';
import { Screen } from './screen';

export type CalculatorIntroProps = {
  calculatorId: string;
  calculatorName: string;
  electionName: string;
  candidateCount: number;
  questions: Question[];
} & CalculatorRef;

const messages = getMessages();

/**
 * The calculator's front door.
 *
 * Its one real job beyond describing the thing is resuming: answers persist in
 * localStorage, so someone returning to a half-finished calculator should land
 * on the question they stopped at rather than being sent back to question 1.
 */
export function CalculatorIntro({
  calculatorId,
  calculatorName,
  electionName,
  electionKey,
  district,
  candidateCount,
  questions,
}: CalculatorIntroProps) {
  const answers = useCalculatorAnswers(calculatorId);
  const resetCalculator = useAnswersStore((s) => s.resetCalculator);
  const router = useRouter();
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  const answered = countAnswered(answers);
  // Held back until the persisted answers land, so the primary action does not
  // change its mind from "Začít" to "Pokračovat" a frame after it appears.
  const inProgress = useAnswersReady() && answered > 0;

  // -1 once every question has been visited; that's the recap's cue.
  const nextIndex = firstUnansweredIndex(questions, answers);
  const resumePath =
    nextIndex === -1
      ? stepPath({ electionKey, district }, 'review')
      : questionPath({ electionKey, district }, nextIndex + 1);

  return (
    <Screen
      electionName={electionName}
      calculator={{ id: calculatorId, electionKey, district }}
      title={calculatorName}
      back={{ href: electionPath(electionKey), label: messages.picker.title }}
      description={format(messages.intro.description, {
        questions: plural(questions.length, {
          one: messages.intro.questionCountOne,
          few: messages.intro.questionCountFew,
          many: messages.intro.questionCountMany,
        }),
      })}
      footer={
        <StickyBar>
          {inProgress ? (
            <>
              <Button variant="ghost" size="large" onClick={() => setConfirmingRestart(true)}>
                {messages.intro.restart}
              </Button>
              <Button as={Link} href={resumePath} size="large">
                {messages.intro.continue}
              </Button>
            </>
          ) : (
            <Button as={Link} href={stepPath({ electionKey, district }, 'guide')} size="large">
              {messages.intro.start}
            </Button>
          )}
        </StickyBar>
      }
    >
      <p className={styles.meta}>
        {format(messages.intro.candidates, {
          candidates: plural(candidateCount, {
            one: messages.intro.candidateCountOne,
            few: messages.intro.candidateCountFew,
            many: messages.intro.candidateCountMany,
          }),
        })}
      </p>

      {inProgress ? (
        <p className={styles.progress}>
          {format(messages.intro.progress, { answered, total: questions.length })}
        </p>
      ) : null}

      <RestartDialog
        open={confirmingRestart}
        onClose={() => setConfirmingRestart(false)}
        onConfirm={() => {
          resetCalculator(calculatorId);
          setConfirmingRestart(false);
          // Same destination as the menu's restart: cleared answers and a
          // screen still saying "Pokračovat" would be its own small lie.
          router.push(questionPath({ electionKey, district }, 1));
        }}
      />
    </Screen>
  );
}
