'use client';

import {
  answerTone,
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
import { getMessages, percent } from '@vk/i18n';
import {
  Button,
  Calculating,
  ComparisonList,
  type ComparisonRow,
  FilterChips,
  IconButton,
  MatchRow,
  type ShareCardContent,
  StickyBar,
} from '@vk/ui';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildAiPrompt } from '../lib/ai-prompt';
import { answerLabelOf } from '../lib/answer-labels';
import { useAnswersReady, useCalculatorAnswers } from '../lib/answers-store';
import { type CalculatorRef, type CalculatorShellInfo, questionPath, stepPath } from '../lib/paths';
import { useDragDismiss } from '../lib/use-drag-dismiss';
import { AppShell } from './app-shell';
import { BackLink } from './back-link';
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

/** Matches the closing animation's duration in the CSS (`--vk-duration-base`). */
const CLOSE_MS = 150;

type ComparisonFilter = 'all' | 'match' | 'mismatch' | 'important';

export function Results({ calculator, electionKey, district }: ResultsProps) {
  const answers = useCalculatorAnswers(calculator.id);
  const ref = { electionKey, district };
  const shellInfo: CalculatorShellInfo = {
    id: calculator.id,
    name: calculator.name,
    electionName: calculator.electionName,
    ...ref,
  };

  const answered = countAnswered(calculator.questions, answers);
  const results = useMemo(() => buildResults(calculator, answers), [calculator, answers]);

  /** The candidate whose comparison is open. Nothing is open on arrival — the dashboard holds the pane. */
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  /**
   * Set for the duration of the close animation only — the comparison for
   * this id keeps rendering (and the pane keeps its sheet/popover styling)
   * after `selectedId` clears, so there is something to animate out instead
   * of the dashboard just appearing underneath it.
   */
  const [closingId, setClosingId] = useState<string | undefined>(undefined);
  /** Which of a comparison's rows are shown — reset whenever a different candidate opens. */
  const [comparisonFilter, setComparisonFilter] = useState<ComparisonFilter>('all');
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
   * The button/Escape route: play the pane's exit animation, then swap to the
   * dashboard once it's finished. A drag dismissal skips this entirely — see
   * `dismissDrag` below — because `useDragDismiss` has already animated the
   * sheet away by the time it calls its own callback.
   */
  const closeComparison = useCallback(() => {
    setSelectedId((current) => {
      if (current !== undefined) setClosingId(current);
      return undefined;
    });
  }, []);
  const dismissDrag = useCallback(() => setSelectedId(undefined), []);
  /* Picking a row while another comparison is still closing cuts the exit
     short — the new one is what's on screen now, so there's nothing left to
     animate out. */
  const selectCandidate = useCallback((candidateId: string) => {
    setClosingId(undefined);
    setSelectedId(candidateId);
  }, []);

  useEffect(() => {
    if (closingId === undefined) return;
    const timer = window.setTimeout(() => setClosingId(undefined), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [closingId]);

  const { sheetRef, handleProps, dragging } = useDragDismiss({
    open: selectedId !== undefined,
    onDismiss: dismissDrag,
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

  /** The comparison rendered in the pane — kept alive through `closingId` so it has something to animate out with. */
  const shownId = selectedId ?? closingId;

  const selected = useMemo(
    () => results.find((result) => result.candidate.id === shownId),
    [results, shownId],
  );

  const comparison = useMemo(() => {
    if (!selected) return undefined;

    return buildComparison(calculator, answers, selected.candidate.id).map(
      (entry): ComparisonRow => ({
        questionId: entry.question.id,
        statement: entry.question.statement,
        user: { tone: answerTone(entry.userAnswer), label: answerLabelOf(entry.userAnswer) },
        candidate: {
          tone: answerTone(entry.candidateAnswer),
          label: answerLabelOf(entry.candidateAnswer),
        },
        agreement: entry.agreement,
        important: entry.userImportant,
        ...(entry.candidateComment ? { comment: entry.candidateComment } : {}),
      }),
    );
  }, [calculator, answers, selected]);

  /*
   * Starting over on the filter every time a different comparison opens, so a
   * "Neshody" pick made on one candidate can't silently hide rows on the next.
   *
   * `shownId` is the effect's *trigger*, not an input it reads — which is why
   * the exhaustive-deps rule reads it as surplus and offers to delete it. Taking
   * that fix would leave an empty dependency array, resetting the filter once on
   * mount and never again. The suppression below has to stay a single line and
   * sit directly on the hook: Biome only parses the first line of a `//` run as
   * the suppression, so a wrapped one silently detaches and stops working.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the dep is the reset trigger, not an input.
  useEffect(() => {
    setComparisonFilter('all');
  }, [shownId]);

  const comparisonCounts = useMemo(() => {
    const counts = { all: 0, match: 0, mismatch: 0, important: 0 };
    for (const row of comparison ?? []) {
      counts.all += 1;
      if (row.agreement === 'match') counts.match += 1;
      else if (row.agreement === 'mismatch') counts.mismatch += 1;
      if (row.important) counts.important += 1;
    }
    return counts;
  }, [comparison]);

  // Only offered when they would leave something — same rule the recap's own
  // filter chips follow for "Nezodpovězené" and "Důležité".
  const comparisonFilterOptions = [
    { id: 'all' as const, label: messages.results.filterAll, count: comparisonCounts.all },
    ...(comparisonCounts.match > 0
      ? [
          {
            id: 'match' as const,
            label: messages.results.filterMatches,
            count: comparisonCounts.match,
          },
        ]
      : []),
    ...(comparisonCounts.mismatch > 0
      ? [
          {
            id: 'mismatch' as const,
            label: messages.results.filterMismatches,
            count: comparisonCounts.mismatch,
          },
        ]
      : []),
    ...(comparisonCounts.important > 0
      ? [
          {
            id: 'important' as const,
            label: messages.results.filterImportant,
            count: comparisonCounts.important,
          },
        ]
      : []),
  ];

  const visibleComparison = useMemo(() => {
    if (!comparison) return comparison;
    if (comparisonFilter === 'all') return comparison;
    if (comparisonFilter === 'important') return comparison.filter((row) => row.important);
    return comparison.filter((row) => row.agreement === comparisonFilter);
  }, [comparison, comparisonFilter]);

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
                  onSelect={() => selectCandidate(candidate.id)}
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
              data-closing={closingId ? '' : undefined}
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
                          {percent(selected.match.matchPercentage)}
                        </p>
                      ) : null}
                    </div>

                    <IconButton
                      icon="close"
                      label={messages.results.closeComparison}
                      onClick={closeComparison}
                    />
                  </div>

                  {comparisonCounts.match > 0 ||
                  comparisonCounts.mismatch > 0 ||
                  comparisonCounts.important > 0 ? (
                    <div className={styles.comparisonFilters}>
                      <FilterChips
                        label={messages.results.filterLabel}
                        options={comparisonFilterOptions}
                        value={comparisonFilter}
                        onChange={(id) => setComparisonFilter(id as ComparisonFilter)}
                      />
                    </div>
                  ) : null}

                  <div className={styles.detailBody}>
                    <ComparisonList
                      rows={visibleComparison ?? []}
                      labels={{
                        you: messages.results.you,
                        candidate: selected.candidate.shortName,
                        important: messages.results.important,
                      }}
                      resetKey={comparisonFilter}
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
