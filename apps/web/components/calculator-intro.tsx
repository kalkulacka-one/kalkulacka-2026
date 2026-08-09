'use client';

import { countAnswered, firstUnansweredIndex, type Question } from '@vk/core';
import { format, getMessages, plural } from '@vk/i18n';
import { Button, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAnswersReady, useAnswersStore, useCalculatorAnswers } from '../lib/answers-store';
import { type CalculatorShellInfo, electionPath, questionPath, stepPath } from '../lib/paths';
import styles from './calculator-intro.module.css';
import { IntroFacts } from './intro-facts';
import { RestartDialog } from './restart-dialog';
import { Screen } from './screen';

export type CalculatorIntroProps = {
  calculator: CalculatorShellInfo;
  candidateCount: number;
  questions: Question[];
};

const messages = getMessages();

/**
 * The calculator's front door: what this is, what happens to your answers, and
 * — for anyone coming back — where you left off.
 *
 * Answers persist in localStorage, so someone returning to a half-finished
 * calculator lands on the question they stopped at rather than being sent back
 * to question 1.
 *
 * This screen briefly redirected first-timers straight to `/navod`, on the
 * grounds that a name and a "Začít" button is not worth a tap. That was
 * treating the symptom: the screen was thin, not redundant. It now carries
 * `IntroFacts`, and the two screens divide the onboarding cleanly — this one
 * explains what the calculator *does* with an answer, `/navod` teaches how to
 * *give* one.
 */
export function CalculatorIntro({ calculator, candidateCount, questions }: CalculatorIntroProps) {
  const {
    id: calculatorId,
    name: calculatorName,
    electionName,
    electionKey,
    district,
  } = calculator;
  const answers = useCalculatorAnswers(calculatorId);
  const resetCalculator = useAnswersStore((s) => s.resetCalculator);
  const router = useRouter();
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  const answered = countAnswered(questions, answers);
  const ready = useAnswersReady();
  // Held back until the persisted answers land, so the primary action does not
  // change its mind from "Začít" to "Pokračovat" a frame after it appears.
  const inProgress = ready && answered > 0;

  // -1 once every question has been visited; that's the recap's cue.
  const nextIndex = firstUnansweredIndex(questions, answers);
  const resumePath =
    nextIndex === -1
      ? stepPath({ electionKey, district }, 'review')
      : questionPath({ electionKey, district }, nextIndex + 1);

  return (
    <Screen
      calculator={calculator}
      title={calculatorName}
      /* The election, not the picker's own heading: every other back link on
         the site names the place it returns to, and "Vyberte město" named an
         instruction instead — which also meant it had to be re-worded the
         moment a senate election, where it is an obvod, used the same link. */
      back={{ href: electionPath(electionKey), label: electionName }}
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
              {/*
                `plate`, not `ghost`: this button now floats directly over the
                backdrop with no container behind it (`StickyBar` dropped its
                panel), and `ghost`'s transparent background needs one to read
                against. `plate` is the token already built for exactly this —
                the back link, the share action, the shell's menu trigger.
              */}
              <Button variant="plate" size="large" onClick={() => setConfirmingRestart(true)}>
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

      {/*
        What answering actually does, for the reader deciding whether to start.
        The screen used to be a name and a button, which is what made merging it
        into the tutorial tempting; the fix was to give it something to say
        rather than to delete it. Deliberately not the gestures — those are the
        next screen's whole job, and a reader who has to be taught to swipe
        twice has been taught nothing the second time.
      */}
      <IntroFacts />

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
