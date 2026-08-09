'use client';

import {
  buildAnswerDistribution,
  buildQuestionConsensus,
  buildResults,
  buildTopicMatches,
  type Calculator,
  countAnswered,
  selectAgainstTheGrain,
  selectImportant,
} from '@vk/core';
import { getMessages, percent } from '@vk/i18n';
import { Button, Calculating, MatchRow, type ShareCardContent, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAiPrompt } from '../lib/ai-prompt';
import { useAnswersReady, useCalculatorAnswers } from '../lib/answers-store';
import { type CalculatorRef, questionPath, shellInfoOf, stepPath } from '../lib/paths';
import { useResultsSync } from '../lib/session-sync';
import { AppShell } from './app-shell';
import { BackLink } from './back-link';
import { ComparisonPane } from './comparison-pane';
import styles from './results.module.css';
import { ResultsDashboard } from './results-dashboard';
import { Screen } from './screen';
import { ShareDialog } from './share-dialog';

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

export function Results({ calculator, electionKey, district }: ResultsProps) {
  const answers = useCalculatorAnswers(calculator.id);
  const ref = { electionKey, district };
  const shellInfo = shellInfoOf(calculator, ref);

  const answered = countAnswered(calculator.questions, answers);
  const results = useMemo(() => buildResults(calculator, answers), [calculator, answers]);

  /**
   * The candidate whose comparison is open. Nothing is open on arrival — the
   * dashboard holds the pane. Clearing this *starts* the pane closing; the exit
   * animation belongs to `ComparisonPane`, which keeps rendering the comparison
   * for a beat after this has already forgotten about it.
   */
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [waited, setWaited] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
   * The one save the flow makes deliberately: a ranking is what marks the
   * session finished server-side and what a shared result is drawn from.
   * Withheld until the persisted answers have landed and there is at least one
   * of them — a ranking computed from an empty map is not a result.
   */
  useResultsSync(
    {
      calculatorId: calculator.id,
      calculatorGroup: electionKey,
      calculatorKey: district,
      calculatorVersion: calculator.version,
    },
    ready && answered > 0 ? results : undefined,
  );

  const closeComparison = useCallback(() => setSelectedId(undefined), []);

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
        answered,
        total: calculator.questions.length,
        results,
        topics,
        important,
        againstTheGrain,
      }),
    };
  }, [calculator, answers, results, answered]);

  /*
   * The page's own address, read after mount rather than during render: there
   * is no `window` on the server, and a share dialog that rendered a URL into
   * the HTML would be baking one visitor's district into everyone's page.
   */
  const [location, setLocation] = useState({ href: '', host: '' });
  useEffect(() => {
    setLocation({ href: window.location.href, host: window.location.host });
  }, []);

  /** What gets painted onto the shared image — the top five, and where they came from. */
  const shareContent = useMemo<ShareCardContent>(
    () => ({
      brand: messages.app.title,
      ...(calculator.electionName ? { electionName: calculator.electionName } : {}),
      ...(calculator.name ? { calculatorName: calculator.name } : {}),
      title: messages.results.title,
      winnerLabel: messages.results.winner,
      entries: results.slice(0, 5).map(({ candidate, match, rank }, index) => ({
        // Ties share a rank, so it is not always the position — but it is
        // always *a* number by the time a result is ranked; the index is only
        // here to satisfy the type.
        rank: rank ?? index + 1,
        // The short name, not the full one: "SPOLU" fits a story where
        // "SPOLU (ODS, KDU-ČSL, TOP 09)" would be trimmed to an ellipsis.
        name: candidate.shortName || candidate.name,
        avatarUrl: candidate.avatarUrl,
        ...(match.matchPercentage === undefined
          ? { noAnswerLabel: messages.results.noAnswer }
          : {
              percentLabel: percent(match.matchPercentage),
              matchPercentage: match.matchPercentage,
            }),
      })),
      url: location.host,
    }),
    [calculator, results, location.host],
  );

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
      <AppShell calculator={shellInfo}>
        <main className={styles.calculating}>
          <Calculating label={messages.results.calculating} />
        </main>
      </AppShell>
    );
  }

  if (answered === 0) {
    return (
      <Screen
        calculator={shellInfo}
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
      calculator={shellInfo}
      /* The ranking is read, not acted on: scrolling the document is what lets
         it carry on under Safari's glass rather than stop in a line above it. */
      scroll="document"
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
              Opens the picture, rather than copying the link on the spot. The
              link is still one press away — it is the dialog's second action —
              but a ranking is a thing people post, and a URL is not.
            */}
            <div className={styles.shareBox}>
              <Button
                variant="plate"
                size="small"
                onClick={() => setShareOpen(true)}
                iconStart="share"
              >
                {messages.results.share}
              </Button>
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
                    match.matchPercentage === undefined ? undefined : percent(match.matchPercentage)
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

            <ComparisonPane
              calculator={calculator}
              answers={answers}
              results={results}
              selectedId={selectedId}
              onClose={closeComparison}
            >
              <ResultsDashboard {...insights} />
            </ComparisonPane>
          </div>
        </div>
      </main>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        content={shareContent}
        fileName={`shoda-${calculator.id}`}
        url={location.href}
      />
    </AppShell>
  );
}
