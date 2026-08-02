'use client';

import {
  type AnswerValue,
  buildComparison,
  buildResults,
  type Calculator,
  countAnswered,
} from '@vk/core';
import { getMessages } from '@vk/i18n';
import {
  type AnswerTone,
  Button,
  ComparisonList,
  type ComparisonRow,
  LoadingIndicator,
  MatchCard,
  StickyBar,
} from '@vk/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAnswersReady, useCalculatorAnswers } from '../lib/answers-store';
import { type CalculatorRef, questionPath, stepPath } from '../lib/paths';
import { AppShell } from './app-shell';
import styles from './results.module.css';
import { Screen } from './screen';

export type ResultsProps = {
  calculator: Calculator;
} & CalculatorRef;

const messages = getMessages();

/**
 * How long the loader is shown even when the answer is instantaneous.
 *
 * The calculation is a few hundred multiplications — it finishes before the
 * screen paints. The pause is not fake work: it is the beat that lets someone
 * register that a result was produced *from their answers* rather than having
 * been sitting there all along, and it gives the number somewhere to arrive
 * from. Reduced-motion skips it entirely.
 */
const CALCULATING_MS = 900;

const TONES: Record<string, AnswerTone> = {
  true: 'agree',
  false: 'disagree',
  null: 'neutral',
};

function toneOf(answer: AnswerValue | undefined): AnswerTone {
  return answer === undefined ? 'none' : (TONES[String(answer)] ?? 'none');
}

function answerLabelOf(answer: AnswerValue | undefined): string {
  if (answer === undefined) return messages.results.answerNone;
  if (answer === null) return messages.results.answerNeutral;
  return answer ? messages.results.answerYes : messages.results.answerNo;
}

/** Czech writes a non-breaking space before the percent sign. */
function percentLabel(value: number): string {
  return `${Math.round(value)} %`;
}

/**
 * Most Pardubice candidates carry a `description` identical to their `name` —
 * the archive stores the same string in both fields. Printing it twice, under
 * itself, reads as a rendering fault, so the second line only appears when it
 * actually says something new.
 */
function subtitleOf(name: string, description?: string): string | undefined {
  return description && description !== name ? description : undefined;
}

export function Results({ calculator, electionKey, district }: ResultsProps) {
  const answers = useCalculatorAnswers(calculator.id);
  const ref = { electionKey, district };

  const answered = countAnswered(answers);
  const results = useMemo(() => buildResults(calculator, answers), [calculator, answers]);

  const [expanded, setExpanded] = useState<string | undefined>(undefined);
  const [waited, setWaited] = useState(false);
  const ready = useAnswersReady();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWaited(true);
      return;
    }

    const timer = window.setTimeout(() => setWaited(true), CALCULATING_MS);
    return () => window.clearTimeout(timer);
  }, []);

  /*
   * Two separate reasons to wait, and both must clear: the deliberate beat
   * above, and the persisted answers actually having arrived. Without the
   * second one a reduced-motion visitor — who skips the beat — would see
   * "nothing to compare" for a frame before their real answers loaded.
   */
  if (!waited || !ready) {
    return (
      // Inside the shell like every other screen: the header and the backdrop
      // carrying straight through is what makes this read as a moment in the
      // flow rather than the app blinking out and coming back.
      <AppShell
        calculatorName={calculator.name}
        electionName={calculator.electionName}
        calculator={{ id: calculator.id, ...ref }}
      >
        <main className={styles.calculating}>
          <LoadingIndicator label={messages.results.calculating} />
        </main>
      </AppShell>
    );
  }

  if (answered === 0) {
    return (
      <Screen
        calculatorName={calculator.name}
        electionName={calculator.electionName}
        calculator={{ id: calculator.id, ...ref }}
        title={messages.results.emptyTitle}
        description={messages.results.emptyDescription}
        footer={
          <StickyBar>
            <Button as={Link} href={questionPath(ref, 1)} size="large">
              {messages.results.emptyAction}
            </Button>
          </StickyBar>
        }
      >
        <div />
      </Screen>
    );
  }

  return (
    <Screen
      calculatorName={calculator.name}
      electionName={calculator.electionName}
      calculator={{ id: calculator.id, ...ref }}
      title={messages.results.title}
      description={messages.results.description}
      back={{ href: stepPath(ref, 'review'), label: messages.results.backToRecap }}
      footer={
        <StickyBar>
          <Button as={Link} href={stepPath(ref, 'review')} variant="ghost" size="large">
            {messages.results.backToRecap}
          </Button>
        </StickyBar>
      }
    >
      <ul className={styles.list}>
        {results.map(({ candidate, match, rank }) => {
          const isOpen = expanded === candidate.id;

          return (
            <MatchCard
              key={candidate.id}
              rank={rank}
              name={candidate.name}
              description={subtitleOf(candidate.name, candidate.description)}
              avatarUrl={candidate.avatarUrl}
              matchPercentage={match.matchPercentage}
              percentLabel={
                match.matchPercentage === undefined
                  ? undefined
                  : percentLabel(match.matchPercentage)
              }
              noAnswerLabel={messages.results.noAnswer}
              toggleLabel={isOpen ? messages.results.hideComparison : messages.results.compare}
              expanded={isOpen}
              onToggle={() => setExpanded(isOpen ? undefined : candidate.id)}
            >
              {isOpen ? (
                <ComparisonList
                  rows={buildComparison(calculator, answers, candidate.id).map(
                    (entry): ComparisonRow => ({
                      questionId: entry.question.id,
                      statement: entry.question.statement,
                      user: {
                        tone: toneOf(entry.userAnswer),
                        label: answerLabelOf(entry.userAnswer),
                      },
                      candidate: {
                        tone: toneOf(entry.candidateAnswer),
                        label: answerLabelOf(entry.candidateAnswer),
                      },
                      agreement: entry.agreement,
                      important: entry.userImportant,
                      ...(entry.candidateComment ? { comment: entry.candidateComment } : {}),
                    }),
                  )}
                  labels={{
                    you: messages.results.you,
                    candidate: candidate.shortName,
                    important: messages.results.important,
                  }}
                />
              ) : null}
            </MatchCard>
          );
        })}
      </ul>
    </Screen>
  );
}
