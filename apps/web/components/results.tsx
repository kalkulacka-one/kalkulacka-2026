'use client';

import {
  type AnswerMap,
  buildAnswerDistribution,
  buildQuestionConsensus,
  buildResults,
  buildTopicMatches,
  type Calculator,
  countAnswered,
  RECAP_FILTER_IMPORTANT,
  selectAgainstTheGrain,
  selectImportant,
  topicFilterId,
} from '@vk/core';
import { getMessages, percent } from '@vk/i18n';
import { Button, Calculating, MatchRow, type ShareCardContent, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildAiPrompt } from '../lib/ai-prompt';
import { trackEvent } from '../lib/analytics';
import { useAnswersReady, useCalculatorAnswers } from '../lib/answers-store';
import { comparisonFilterSlug } from '../lib/comparison-filters';
import { type CalculatorRef, questionPath, shellInfoOf, stepPath } from '../lib/paths';
import { canSync, useResultsSync } from '../lib/session-sync';
import { toProxiedAssetUrl } from '../lib/share-asset-url';
import { AppShell } from './app-shell';
import { BackLink } from './back-link';
import { ComparisonPane } from './comparison-pane';
import styles from './results.module.css';
import { ResultsDashboard } from './results-dashboard';
import { Screen } from './screen';
import { ShareDialog } from './share-dialog';

/**
 * Somebody else's result, loaded server-side from a public link.
 *
 * Its presence is the whole read-only switch: the answers come from here
 * instead of from the store, nothing is saved back, and the screen says whose
 * result this is rather than offering the ways out of your own.
 */
export type SharedView = {
  /** Recomputed from, not displayed as, the ranking stored with the session. */
  answers: AnswerMap;
};

export type ResultsProps = {
  calculator: Calculator;
  shared?: SharedView;
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

/**
 * A row's `delay` when the entrance should not play at all: a negative delay
 * longer than any of the row's animations (`--vk-duration-slow`, 250ms)
 * starts them already finished — the ranking is simply there. Used on a
 * return visit, where the reveal has already happened.
 */
const SKIP_ENTRANCE_DELAY = -1;

/**
 * The calculating beat and the bottom-up stagger are a *reveal* — they earn
 * their time exactly once. Coming back from the comparison view (or any other
 * later visit in the same browsing session) is not a reveal, so the first
 * showing is remembered here. Session-scoped on purpose: a fresh visit
 * tomorrow deserves the beat again. sessionStorage throws in some private
 * modes; a visitor there just gets the beat every time.
 */
const seenKey = (calculatorId: string) => `vk-results-shown:${calculatorId}`;

function hasSeenResults(calculatorId: string): boolean {
  try {
    return window.sessionStorage.getItem(seenKey(calculatorId)) !== null;
  } catch {
    return false;
  }
}

function markResultsSeen(calculatorId: string): void {
  try {
    window.sessionStorage.setItem(seenKey(calculatorId), '1');
  } catch {
    /* The next visit replays the beat — harmless. */
  }
}

/**
 * How much of the ranking shows before the tail folds behind "Zobrazit další
 * strany". Five, because that is where a share card cuts too — the part of a
 * ranking people actually read.
 */
const COLLAPSED_RESULTS = 5;

export function Results({ calculator, electionKey, district, shared }: ResultsProps) {
  /*
   * Read unconditionally — hooks are — but ignored on a shared result. That is
   * the only contact this screen then has with the viewer's own store: a
   * subscription, no write, and no sync target built from it.
   */
  const ownAnswers = useCalculatorAnswers(calculator.id);
  const answers = shared?.answers ?? ownAnswers;
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
  /*
   * The beat is skipped outright on a shared result: it exists to let someone
   * register that a ranking came out of the answers they just gave, and the
   * visitor of a public link gave none. Waiting there would be theatre.
   */
  const [waited, setWaited] = useState(shared !== undefined);
  /**
   * True when this session has already seen this ranking revealed — the beat
   * is skipped above and the rows land without their entrance (see
   * `SKIP_ENTRANCE_DELAY`). State rather than a render-time sessionStorage
   * read: the server renders too, and it has no session to ask.
   */
  const [revisit, setRevisit] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const localReady = useAnswersReady();
  /* Server-supplied answers are ready in the first render — nothing to hydrate. */
  const ready = shared !== undefined || localReady;

  useEffect(() => {
    if (shared) return;

    if (hasSeenResults(calculator.id)) {
      setRevisit(true);
      setWaited(true);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setWaited(true);
      markResultsSeen(calculator.id);
      return;
    }

    const timer = window.setTimeout(() => {
      setWaited(true);
      markResultsSeen(calculator.id);
    }, CALCULATING_MS);
    return () => window.clearTimeout(timer);
  }, [shared, calculator.id]);

  /*
   * The one save the flow makes deliberately: a ranking is what marks the
   * session finished server-side and what a shared result is drawn from.
   * Withheld until the persisted answers have landed and there is at least one
   * of them — a ranking computed from an empty map is not a result — and
   * withheld entirely on a shared result, where the ranking on screen is not
   * the viewer's to save over.
   */
  useResultsSync(
    {
      calculatorId: calculator.id,
      calculatorGroup: electionKey,
      calculatorKey: district,
      calculatorVersion: calculator.version,
    },
    !shared && ready && answered > 0 ? results : undefined,
  );

  /*
   * Once per visit, the moment a ranking is first on screen for its own
   * owner — the same condition `useResultsSync` saves on, so "completed"
   * means the same thing here as it does server-side. `waited` is in the
   * guard too: skipping it would count the calculating beat, not the result.
   */
  const completedTracked = useRef(false);
  useEffect(() => {
    if (shared || !ready || !waited || answered === 0 || completedTracked.current) return;
    completedTracked.current = true;
    trackEvent('Calculator completed', { calculator: calculator.id });
  }, [shared, ready, waited, answered, calculator.id]);

  const closeComparison = useCallback(() => setSelectedId(undefined), []);

  /**
   * Whether the ranking's tail (below the fifth row) has been unfolded.
   * One-way by design — see the buttons under the list.
   */
  const [showAllParties, setShowAllParties] = useState(false);
  const visibleResults = showAllParties ? results : results.slice(0, COLLAPSED_RESULTS);
  const hiddenResults = results.length - visibleResults.length;

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
   * The page's own host, read after mount rather than during render: there is
   * no `window` on the server, and a share card that rendered it into the
   * HTML would be baking one visitor's district into everyone's page. (The
   * share dialog itself needs no address from here — it builds the OS sheet's
   * URL from `ref` and the calculator's *intro* route, never this page's own.)
   */
  const [host, setHost] = useState('');
  useEffect(() => {
    setHost(window.location.host);
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
        // Routed through the same-origin proxy here only: the canvas export
        // needs readable pixels (the CDN sends no CORS header), everywhere
        // else on this screen keeps loading the CDN directly.
        avatarUrl: toProxiedAssetUrl(candidate.avatarUrl, calculator),
        color: candidate.color,
        ...(match.matchPercentage === undefined
          ? { noAnswerLabel: messages.results.noAnswer }
          : {
              percentLabel: percent(match.matchPercentage),
              matchPercentage: match.matchPercentage,
            }),
      })),
      url: host,
    }),
    [calculator, results, host],
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
      readOnly={shared !== undefined}
    >
      <main className={styles.screen}>
        <div className={styles.inner}>
          <header className={styles.head}>
            {shared ? (
              /*
                Said before the ranking, not after it: someone arriving from a
                link needs to know whose numbers these are before they read
                them, and needs to know their own answers are safe before they
                touch anything.
              */
              <p className={styles.sharedNote}>{messages.results.shared.note}</p>
            ) : (
              <div className={styles.headBack}>
                <BackLink href={stepPath(ref, 'review')} label={messages.results.backToRecap} />
              </div>
            )}

            {/*
              No standing caveat under the title. That the match rests only on
              answered questions is still stated where it can be acted on —
              the dashboard's donut counts "Bez odpovědi" explicitly, and a
              candidate who answered nothing says so on their own row.
            */}
            <h1 className={styles.title}>
              {shared ? messages.results.shared.title : messages.results.title}
            </h1>

            {/* Not on a shared result: the answers on this screen aren't the
                visitor's, so "svoje odpovědi" would be a false promise. */}
            {shared ? null : <p className={styles.listHint}>{messages.results.listHint}</p>}

            <div className={styles.shareBox}>
              {shared ? (
                /* The only thing this page asks of its visitor. */
                <Button as={Link} href={stepPath(ref, 'intro')} size="small" iconEnd="arrowRight">
                  {messages.results.shared.cta}
                </Button>
              ) : (
                /*
                  Opens the picture, rather than copying the link on the spot.
                  The link is still one press away — it is the dialog's second
                  action — but a ranking is a thing people post, and a URL is
                  not.
                */
                <Button
                  variant="plate"
                  size="small"
                  onClick={() => setShareOpen(true)}
                  iconStart="share"
                >
                  {messages.results.share}
                </Button>
              )}
            </div>
          </header>

          <div className={styles.panes}>
            <div className={styles.listPane}>
              <ul className={styles.list}>
                {visibleResults.map(({ candidate, match, rank }, index) => (
                  <MatchRow
                    key={candidate.id}
                    rank={rank}
                    name={candidate.name}
                    avatarUrl={candidate.avatarUrl}
                    color={candidate.color}
                    matchPercentage={match.matchPercentage}
                    percentLabel={
                      match.matchPercentage === undefined
                        ? undefined
                        : percent(match.matchPercentage)
                    }
                    noAnswerLabel={messages.results.noAnswer}
                    winner={rank === 1}
                    winnerLabel={messages.results.winner}
                    selected={candidate.id === selectedId}
                    onSelect={() => setSelectedId(candidate.id)}
                    /* Reversed, so the list assembles from the bottom and the top
                   match is the last thing to land — unless this session has
                   already watched it land once. */
                    delay={
                      revisit
                        ? SKIP_ENTRANCE_DELAY
                        : (visibleResults.length - 1 - index) * ROW_STAGGER
                    }
                  />
                ))}
              </ul>

              {/*
                The tail of the ranking is offered, not shown: places six and
                down are rarely what anyone came for, and folding them is what
                makes room to offer the question-centric view instead. One-way —
                a ranking that re-folds under the reader is worse than a long
                one. The comparison link stays after expanding; only a shared
                result drops it, since that view compares the *visitor's* store
                against a ranking that isn't theirs.
              */}
              {hiddenResults > 0 || !shared ? (
                <div className={styles.listActions}>
                  {hiddenResults > 0 ? (
                    <Button variant="outline" size="small" onClick={() => setShowAllParties(true)}>
                      {messages.results.showMoreParties} ({hiddenResults})
                    </Button>
                  ) : null}

                  {shared ? null : (
                    <Button
                      as={Link}
                      href={stepPath(ref, 'comparison')}
                      variant="outline"
                      size="small"
                      iconEnd="arrowRight"
                    >
                      {messages.results.compareAnswers}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>

            <ComparisonPane
              calculator={calculator}
              answers={answers}
              results={results}
              selectedId={selectedId}
              onClose={closeComparison}
            >
              <ResultsDashboard
                {...insights}
                comparePaths={
                  shared
                    ? undefined
                    : {
                        important: stepPath(
                          ref,
                          'comparison',
                          comparisonFilterSlug(RECAP_FILTER_IMPORTANT),
                        ),
                        topic: (topic) =>
                          stepPath(ref, 'comparison', comparisonFilterSlug(topicFilterId(topic))),
                      }
                }
              />
            </ComparisonPane>
          </div>
        </div>
      </main>

      {/*
        Not rendered at all on a shared result: the image would be a copy of
        somebody else's card, and the link path below mints from *your* session
        for this calculator, which a visitor here has no reason to have.
      */}
      {shared ? null : (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          content={shareContent}
          fileName={`shoda-${calculator.id}`}
          calculatorRef={ref}
          /* Absent without a backend, which is what keeps the dialog image-only
             on a fork that configured none. */
          link={
            canSync(calculator.id)
              ? {
                  calculatorId: calculator.id,
                  resultPath: (publicId: string) => stepPath(ref, 'result', publicId),
                }
              : undefined
          }
        />
      )}
    </AppShell>
  );
}
