'use client';

import {
  type AnswerValue,
  buildAnswerDistribution,
  buildComparison,
  buildQuestionConsensus,
  buildResults,
  buildTopicMatches,
  type Calculator,
  countAnswered,
  selectAgainstTheGrain,
  selectImportant,
} from '@vk/core';
import { getMessages } from '@vk/i18n';
import {
  type AnswerMarkTone,
  Button,
  Calculating,
  ComparisonList,
  type ComparisonRow,
  IconButton,
  MatchRow,
  StickyBar,
} from '@vk/ui';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAiPrompt } from '../lib/ai-prompt';
import { useAnswersReady, useCalculatorAnswers } from '../lib/answers-store';
import { copyText } from '../lib/clipboard';
import { type CalculatorRef, questionPath, stepPath } from '../lib/paths';
import { useDragDismiss } from '../lib/use-drag-dismiss';
import { AppShell } from './app-shell';
import { BackLink } from './back-link';
import styles from './results.module.css';
import { ResultsDashboard } from './results-dashboard';
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
 * been sitting there all along. Matched to the film-gate animation's own length
 * so the loader is allowed to finish resolving rather than being cut off
 * mid-shutter. Reduced motion skips it entirely.
 */
const CALCULATING_MS = 1700;

/** Seconds between two rows arriving. Nine rows land inside half a second. */
const ROW_STAGGER = 0.06;

const TONES: Record<string, AnswerMarkTone> = {
  true: 'agree',
  false: 'disagree',
  null: 'neutral',
};

function toneOf(answer: AnswerValue | undefined): AnswerMarkTone {
  return answer === undefined ? 'none' : (TONES[String(answer)] ?? 'none');
}

function answerLabelOf(answer: AnswerValue | undefined): string {
  if (answer === undefined) return messages.results.answerNone;
  if (answer === null) return messages.results.answerNeutral;
  return answer ? messages.results.answerYes : messages.results.answerNo;
}

/** Czech writes a non-breaking space before the percent sign. */
function percentLabel(value: number): string {
  return `${Math.round(value)} %`;
}

export function Results({ calculator, electionKey, district }: ResultsProps) {
  const answers = useCalculatorAnswers(calculator.id);
  const ref = { electionKey, district };

  const answered = countAnswered(calculator.questions, answers);
  const results = useMemo(() => buildResults(calculator, answers), [calculator, answers]);

  /** The candidate whose comparison is open. Nothing is open on arrival — the dashboard holds the pane. */
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [waited, setWaited] = useState(false);
  /** `idle` until the share button is pressed, then whether the copy landed. */
  const [shareState, setShareState] = useState<'idle' | 'done' | 'failed'>('idle');
  const ready = useAnswersReady();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWaited(true);
      return;
    }

    const timer = window.setTimeout(() => setWaited(true), CALCULATING_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (shareState === 'idle') return;
    // The failure notice earns a longer look than the success one — it is asking
    // the reader to go and do something rather than confirming it was done.
    const timer = window.setTimeout(
      () => setShareState('idle'),
      shareState === 'failed' ? 6000 : 2400,
    );
    return () => window.clearTimeout(timer);
  }, [shareState]);

  const share = useCallback(async () => {
    setShareState((await copyText(window.location.href)) ? 'done' : 'failed');
  }, []);

  const closeComparison = useCallback(() => setSelectedId(undefined), []);
  const { sheetRef, handleProps, dragging } = useDragDismiss({
    open: selectedId !== undefined,
    onDismiss: closeComparison,
  });

  /*
   * Everything the dashboard reads, derived together: they all walk the same
   * answers against the same candidates, and computing them in one memo keeps
   * that work off every re-render caused by opening a comparison.
   */
  const insights = useMemo(() => {
    const consensus = buildQuestionConsensus(calculator, answers);
    const topics = buildTopicMatches(calculator, answers);
    const important = selectImportant(consensus);
    const againstTheGrain = selectAgainstTheGrain(consensus);

    return {
      distribution: buildAnswerDistribution(calculator.questions, answers),
      topics,
      important,
      againstTheGrain,
      prompt: buildAiPrompt({
        electionName: calculator.electionName,
        districtName: calculator.name,
        answered: countAnswered(calculator.questions, answers),
        total: calculator.questions.length,
        results,
        topics,
        important,
        againstTheGrain,
      }),
    };
  }, [calculator, answers, results]);

  const selected = useMemo(
    () => results.find((result) => result.candidate.id === selectedId),
    [results, selectedId],
  );

  const comparison = useMemo(() => {
    if (!selected) return undefined;

    return buildComparison(calculator, answers, selected.candidate.id).map(
      (entry): ComparisonRow => ({
        questionId: entry.question.id,
        statement: entry.question.statement,
        user: { tone: toneOf(entry.userAnswer), label: answerLabelOf(entry.userAnswer) },
        candidate: {
          tone: toneOf(entry.candidateAnswer),
          label: answerLabelOf(entry.candidateAnswer),
        },
        agreement: entry.agreement,
        important: entry.userImportant,
        ...(entry.candidateComment ? { comment: entry.candidateComment } : {}),
      }),
    );
  }, [calculator, answers, selected]);

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
          <Calculating label={messages.results.calculating} />
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
    <AppShell
      calculatorName={calculator.name}
      electionName={calculator.electionName}
      calculator={{ id: calculator.id, ...ref }}
    >
      <main className={styles.screen}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <div className={styles.headBack}>
              <BackLink href={stepPath(ref, 'review')} label={messages.results.backToRecap} />
            </div>

            {/*
              No standing caveat under the title. That the match rests only on
              answered questions is still stated where it can be acted on —
              the dashboard's donut counts "Bez odpovědi" explicitly, and a
              candidate who answered nothing says so on their own row.
            */}
            <h1 className={styles.title}>{messages.results.title}</h1>

            {/*
              A copy can genuinely fail — the clipboard permission is refusable,
              and a phone opening the dev server over a plain-http address has no
              clipboard API at all. Saying so beats a button that appears inert.
            */}
            <div className={styles.shareBox}>
              <Button variant="plate" size="small" onClick={share} iconStart="share">
                {shareState === 'done' ? messages.results.shareCopied : messages.results.share}
              </Button>
              {shareState === 'failed' ? (
                <p className={styles.shareHint} role="status">
                  {messages.results.shareFallback}
                </p>
              ) : null}
            </div>
          </header>

          <div className={styles.panes}>
            <ul className={styles.list}>
              {results.map(({ candidate, match, rank }, index) => (
                <MatchRow
                  key={candidate.id}
                  rank={rank}
                  name={candidate.name}
                  avatarUrl={candidate.avatarUrl}
                  matchPercentage={match.matchPercentage}
                  percentLabel={
                    match.matchPercentage === undefined
                      ? undefined
                      : percentLabel(match.matchPercentage)
                  }
                  noAnswerLabel={messages.results.noAnswer}
                  winner={rank === 1}
                  winnerLabel={messages.results.winner}
                  selected={candidate.id === selectedId}
                  onSelect={() => setSelectedId(candidate.id)}
                  /* Reversed, so the list assembles from the bottom and the top
                   match is the last thing to land. */
                  delay={(results.length - 1 - index) * ROW_STAGGER}
                />
              ))}
            </ul>

            {/*
            One element, two presentations: the right-hand pane on a desktop, and
            a bottom sheet over the list on a phone once something is open.
            Rendering it twice — once per breakpoint — is how the scroll position
            and the copy button's state end up differing between the two.
          */}
            <section
              ref={sheetRef as React.RefObject<HTMLElement>}
              className={styles.detail}
              data-open={selected ? '' : undefined}
              data-dragging={dragging ? '' : undefined}
            >
              {selected && comparison ? (
                <>
                  {/* Phone only (hidden by the CSS above the two-pane breakpoint):
                      drag it down to put the sheet away. */}
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: the
                      close button beside it is the keyboard and assistive-tech
                      route; this is a pointer affordance layered on top. */}
                  <div className={styles.grip} {...handleProps} aria-hidden="true" />
                  <div className={styles.detailHead}>
                    <div className={styles.detailHeading}>
                      <h2 className={styles.detailTitle}>{selected.candidate.name}</h2>
                      {selected.match.matchPercentage !== undefined ? (
                        <p className={styles.detailPercent}>
                          {percentLabel(selected.match.matchPercentage)}
                        </p>
                      ) : null}
                    </div>

                    <IconButton
                      icon="close"
                      label={messages.results.closeComparison}
                      onClick={closeComparison}
                    />
                  </div>

                  <div className={styles.detailBody}>
                    <ComparisonList
                      rows={comparison}
                      labels={{
                        you: messages.results.you,
                        candidate: selected.candidate.shortName,
                        important: messages.results.important,
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className={styles.detailBody}>
                  <ResultsDashboard {...insights} />
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
