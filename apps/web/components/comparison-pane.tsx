'use client';

import {
  type AnswerMap,
  answerTone,
  buildComparison,
  type Calculator,
  type CandidateResult,
} from '@vk/core';
import { getMessages, percent } from '@vk/i18n';
import { ComparisonList, type ComparisonRow, FilterChips, IconButton } from '@vk/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { answerLabelOf } from '../lib/answer-labels';
import { useDragDismiss } from '../lib/use-drag-dismiss';
import styles from './comparison-pane.module.css';

const messages = getMessages();

/** Matches the closing animation's duration in the CSS (`--vk-duration-base`). */
const CLOSE_MS = 150;

type ComparisonFilter = 'all' | 'match' | 'mismatch' | 'important';

export type ComparisonPaneProps = {
  calculator: Calculator;
  answers: AnswerMap;
  /** The ranked list, so the pane can still find a candidate that is on its way out. */
  results: CandidateResult[];
  /** Whose comparison is open. `undefined` means the pane shows `children` instead. */
  selectedId: string | undefined;
  /** Asks the owner to clear `selectedId`. The exit animation is this pane's business. */
  onClose: () => void;
  /** What the pane holds when nothing is selected — the insight dashboard. */
  children: ReactNode;
};

/**
 * One candidate's answers against the reader's own — and, when nothing is
 * picked, whatever the caller puts in the same box.
 *
 * The pane owns its own exit: `selectedId` clearing is the *start* of closing,
 * not the end of it, so the comparison has to keep rendering for a beat after
 * the owner has already forgotten about it.
 */
export function ComparisonPane({
  calculator,
  answers,
  results,
  selectedId,
  onClose,
  children,
}: ComparisonPaneProps) {
  /**
   * Set for the duration of the close animation only — the comparison for
   * this id keeps rendering (and the pane keeps its sheet/popover styling)
   * after `selectedId` clears, so there is something to animate out instead
   * of the dashboard just appearing underneath it.
   */
  const [closingId, setClosingId] = useState<string | undefined>(undefined);
  /** Which of a comparison's rows are shown — reset whenever a different candidate opens. */
  const [comparisonFilter, setComparisonFilter] = useState<ComparisonFilter>('all');

  /*
   * The button/Escape route: play the pane's exit animation, then swap to the
   * dashboard once it's finished. A drag dismissal skips this entirely — see
   * `dismissDrag` below — because `useDragDismiss` has already animated the
   * sheet away by the time it calls its own callback.
   */
  const closeComparison = useCallback(() => {
    if (selectedId !== undefined) setClosingId(selectedId);
    onClose();
  }, [selectedId, onClose]);

  const dismissDrag = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (closingId === undefined) return;
    const timer = window.setTimeout(() => setClosingId(undefined), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [closingId]);

  const { sheetRef, handleProps, dragging } = useDragDismiss({
    open: selectedId !== undefined,
    onDismiss: dismissDrag,
  });

  /** The comparison rendered in the pane — kept alive through `closingId` so it has something to animate out with. */
  const shownId = selectedId ?? closingId;

  /*
   * Only *closing* while nothing is selected. Picking a row while another
   * comparison is still on its way out cuts the exit short — the new one is
   * what's on screen now, so there is nothing left to animate out. Derived
   * rather than cleared by hand at the moment of selection, which keeps the
   * rule in one place and out of the owner's select handler.
   */
  const closing = selectedId === undefined && closingId !== undefined;

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

  return (
    /*
      One element, two presentations: the right-hand pane on a desktop, and
      a bottom sheet over the list on a phone once something is open.
      Rendering it twice — once per breakpoint — is how the scroll position
      and the copy button's state end up differing between the two.
    */
    <section
      ref={sheetRef as React.RefObject<HTMLElement>}
      className={styles.detail}
      data-open={selected ? '' : undefined}
      data-closing={closing ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
    >
      {selected && comparison ? (
        <>
          {/*
            Phone only (hidden by the CSS above the two-pane breakpoint): drag it down to
            put the sheet away. The close button beside it is the keyboard and
            assistive-tech route; this is a pointer affordance layered on top.
          */}
          <div className={styles.grip} {...handleProps} aria-hidden="true" />
          <div className={styles.detailHead}>
            <div className={styles.detailHeading}>
              <h2 className={styles.detailTitle}>{selected.candidate.name}</h2>
              {selected.match.matchPercentage !== undefined ? (
                <p className={styles.detailPercent}>{percent(selected.match.matchPercentage)}</p>
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
        <div className={styles.detailBody}>{children}</div>
      )}
    </section>
  );
}
