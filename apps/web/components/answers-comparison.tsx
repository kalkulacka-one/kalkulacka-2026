'use client';

import {
  answerTone,
  buildAnswerGroups,
  buildResults,
  type Calculator,
  type CandidatePosition,
  countRecapTopics,
  countRecapTotals,
  matchesRecapFilter,
  RECAP_FILTER_ALL,
  RECAP_FILTER_IMPORTANT,
  type RecapFilterId,
  topicFilterId,
} from '@vk/core';
import { getMessages } from '@vk/i18n';
import { AnswerMark, Avatar, AvatarStack, Button, FilterChips, Icon, Tag } from '@vk/ui';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '../lib/analytics';
import { answerLabelOf } from '../lib/answer-labels';
import { useAnswersReady, useCalculatorAnswers } from '../lib/answers-store';
import { comparisonFilterFromSlug, comparisonFilterSlug } from '../lib/comparison-filters';
import { type CalculatorRef, shellInfoOf, stepPath } from '../lib/paths';
import styles from './answers-comparison.module.css';
import { AppShell } from './app-shell';
import { BackLink } from './back-link';

const messages = getMessages();

export type AnswersComparisonProps = {
  calculator: Calculator;
  /** The URL's filter segment — `dulezite` or a topic slug. Absent = everything. */
  initialFilter?: string;
} & CalculatorRef;

/** How many faces a collapsed row's stack shows before the "+n" disc. */
const STACK_MAX = 5;

/**
 * One party's row inside an expanded question — face, name and, where the
 * party left one, their own comment straight underneath. Not collapsible:
 * a reader who opened the question already asked to see this level of
 * detail, and a comment hidden behind a second click inside an already-open
 * disclosure is one click too many.
 *
 * `withMark` adds the party's own answer mark — wanted only in the merged
 * "nevím / bez odpovědi" group, where the mark is what tells an explicit
 * shrug from silence; in the yes/no groups the group header already says it.
 */
function PartyRow({ position, withMark }: { position: CandidatePosition; withMark?: boolean }) {
  const { candidate, comment } = position;

  return (
    <li className={styles.party}>
      <div className={styles.partyLine}>
        <Avatar name={candidate.name} src={candidate.avatarUrl} size="small" />
        <span className={styles.partyName}>{candidate.name}</span>

        {withMark ? (
          <AnswerMark
            tone={answerTone(position.answer)}
            label={answerLabelOf(position.answer)}
            size="small"
          />
        ) : null}
      </div>

      {comment ? <p className={styles.comment}>{comment}</p> : null}
    </li>
  );
}

/**
 * One side of a question — everyone who gave this answer.
 *
 * `you` marks the group holding the reader's own position with a plain "Vy"
 * tag, neutral-toned rather than agree-toned: the tag says whose side this
 * is, not that the side is good — a green pill under "Ne" would read as
 * praise for having disagreed. No tinted container either, by request; the
 * tag alone is what keeps the party order (best-match-first) undisturbed by
 * any re-sorting.
 *
 * Shared by all three groups — including the merged "nevím / bez odpovědi"
 * one, via `icon`/`withMark` — so a header never has to duplicate this
 * structure by hand.
 */
function AnswerGroup({
  icon,
  label,
  positions,
  you,
  withMark,
}: {
  icon: ReactNode;
  label: string;
  positions: CandidatePosition[];
  you: boolean;
  withMark?: boolean;
}) {
  if (positions.length === 0) return null;

  return (
    <section className={styles.group} data-you={you || undefined}>
      <h3 className={styles.groupHead}>
        <span className={styles.groupIcon}>{icon}</span>
        <span className={styles.groupLabel}>{label}</span>
        <span className={styles.groupCount}>{positions.length}</span>
        {you ? <Tag tone="neutral">{messages.comparison.you}</Tag> : null}
      </h3>

      <ul className={styles.groupList}>
        {positions.map((position) => (
          <PartyRow key={position.candidate.id} position={position} withMark={withMark} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Every party's answer to every question, side by side with the reader's own.
 *
 * The question-centric counterpart of the per-candidate comparison pane: that
 * one asks "how does this party line up with me overall", this one asks "who
 * stands where on this question". Rows collapse to a scannable line — the
 * statement, your mark, and two face stacks — because forty questions times
 * nine parties in full would be a wall; the stacks' popover answers "whose
 * faces are those" without opening anything.
 *
 * Unlike `buildComparison` this includes questions the reader skipped: the
 * subject here is the parties' positions, and a question you didn't answer
 * still has nine of those worth reading.
 */
export function AnswersComparison({
  calculator,
  electionKey,
  district,
  initialFilter,
}: AnswersComparisonProps) {
  const answers = useCalculatorAnswers(calculator.id);
  const ready = useAnswersReady();
  const ref = { electionKey, district };
  const shellInfo = shellInfoOf(calculator, ref);

  const topics = useMemo(
    () => countRecapTopics(calculator.questions).map(([topic]) => topic),
    [calculator],
  );

  const [filter, setFilter] = useState<RecapFilterId>(() =>
    comparisonFilterFromSlug(initialFilter, topics),
  );
  /** Which questions are open, by id. Reset when the filter changes. */
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  /*
   * The ranking decides the order of faces inside every group: the stacks are
   * a sample (the first five), and the sample should be the parties the reader
   * has most reason to recognise — the ones at the top of their result.
   */
  const rankOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const result of buildResults(calculator, answers)) {
      map.set(result.candidate.id, result.rank ?? Number.MAX_SAFE_INTEGER);
    }
    return map;
  }, [calculator, answers]);

  const groups = useMemo(() => {
    const byRank = (a: CandidatePosition, b: CandidatePosition) =>
      (rankOf.get(a.candidate.id) ?? Number.MAX_SAFE_INTEGER) -
      (rankOf.get(b.candidate.id) ?? Number.MAX_SAFE_INTEGER);

    // `other` keeps the builder's order — neutrals ahead of the silent — so
    // an explicit "nevím" with a comment isn't buried under empty rows.
    return buildAnswerGroups(calculator).map((entry) => ({
      ...entry,
      yes: [...entry.yes].sort(byRank),
      no: [...entry.no].sort(byRank),
    }));
  }, [calculator, rankOf]);

  const visible = useMemo(
    () => groups.filter((entry) => matchesRecapFilter(entry.question, answers, filter)),
    [groups, answers, filter],
  );

  const { total, important } = countRecapTotals(calculator.questions, answers);

  const filterOptions = [
    { id: RECAP_FILTER_ALL, label: messages.comparison.filterAll, count: total },
    ...(important > 0
      ? [
          {
            id: RECAP_FILTER_IMPORTANT,
            label: messages.comparison.filterImportant,
            count: important,
          },
        ]
      : []),
    ...countRecapTopics(calculator.questions).map(([topic, count], index) => ({
      id: topicFilterId(topic),
      label: topic,
      count,
      separatorBefore: index === 0,
    })),
  ];

  const changeFilter = (id: string) => {
    setFilter(id);
    setExpanded(new Set());
    // The URL keeps up without a navigation: the screen already has the data
    // for every filter, and a server round-trip would only re-fetch it.
    window.history.replaceState(null, '', stepPath(ref, 'comparison', comparisonFilterSlug(id)));
  };

  const toggleQuestion = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const viewedTracked = useRef(false);
  useEffect(() => {
    if (viewedTracked.current) return;
    viewedTracked.current = true;
    trackEvent('Comparison viewed', { calculator: calculator.id });
  }, [calculator.id]);

  return (
    <AppShell calculator={shellInfo} scroll="document">
      <main className={styles.screen}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <BackLink href={stepPath(ref, 'result')} label={messages.comparison.back} />
            <h1 className={styles.title}>{messages.comparison.title}</h1>
            <p className={styles.description}>{messages.comparison.description}</p>
          </header>

          <div className={styles.filters}>
            <FilterChips
              label={messages.comparison.filterLabel}
              options={filterOptions}
              value={filter}
              onChange={changeFilter}
            />
          </div>

          {!ready ? null : visible.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyText}>{messages.comparison.emptyFilter}</p>
              <Button variant="outline" size="small" onClick={() => changeFilter(RECAP_FILTER_ALL)}>
                {messages.comparison.emptyFilterAction}
              </Button>
            </div>
          ) : (
            /* Keyed on the filter so switching it replays the entrance
               animation — the same "new result landing" cue the recap and the
               comparison pane give. */
            <ul className={styles.list} key={filter}>
              {visible.map((entry) => {
                const answer = answers[entry.question.id];
                const isExpanded = expanded.has(entry.question.id);
                const isImportant = answer?.isImportant === true;
                const userAnswer = answer?.answer;

                return (
                  <li
                    key={entry.question.id}
                    className={styles.row}
                    data-expanded={isExpanded || undefined}
                  >
                    <button
                      type="button"
                      className={styles.rowToggle}
                      aria-expanded={isExpanded}
                      onClick={() => toggleQuestion(entry.question.id)}
                    >
                      <span className={styles.statement}>
                        {isImportant ? (
                          <Icon name="star" size={13} filled className={styles.star} />
                        ) : null}
                        {entry.question.statement}
                        {isImportant ? (
                          <span className={styles.srOnly}> ({messages.results.important})</span>
                        ) : null}
                      </span>

                      <span className={styles.chevron}>
                        <Icon name={isExpanded ? 'chevronUpThin' : 'chevronDownThin'} size={18} />
                      </span>
                    </button>

                    {/*
                      The summary line belongs to the collapsed card only. Open,
                      the groups below say the same thing at full length — and
                      which of them is the reader's own is carried by the "Vy"
                      tag on that group's heading, so repeating their mark up
                      here would be the answer stated twice.
                    */}
                    {isExpanded ? null : (
                      <div className={styles.rowMeta}>
                        {/* The mark carries the full answer for a screen reader;
                            the visible text is just "Vy", set like the column
                            heading the 1:1 comparison puts over the same mark. */}
                        <span className={styles.yourAnswer}>
                          <span className={styles.groupIcon}>
                            <AnswerMark
                              tone={answerTone(userAnswer)}
                              label={`${messages.comparison.you}: ${answerLabelOf(userAnswer)}`}
                              size="small"
                            />
                          </span>
                          <span className={styles.youLabel} aria-hidden="true">
                            {messages.comparison.you}
                          </span>
                        </span>

                        <span className={styles.stacks}>
                          {entry.yes.length > 0 ? (
                            <span className={`${styles.stackPair} ${styles.stackYes}`}>
                              <AnswerMark tone="agree" size="small" />
                              <AvatarStack
                                items={entry.yes.map(({ candidate }) => ({
                                  id: candidate.id,
                                  name: candidate.name,
                                  avatarUrl: candidate.avatarUrl,
                                }))}
                                max={STACK_MAX}
                                label={messages.comparison.stackYes}
                                popover={{ closeLabel: messages.comparison.close }}
                              />
                            </span>
                          ) : null}

                          {entry.no.length > 0 ? (
                            <span className={`${styles.stackPair} ${styles.stackNo}`}>
                              <AnswerMark tone="disagree" size="small" />
                              <AvatarStack
                                items={entry.no.map(({ candidate }) => ({
                                  id: candidate.id,
                                  name: candidate.name,
                                  avatarUrl: candidate.avatarUrl,
                                }))}
                                max={STACK_MAX}
                                label={messages.comparison.stackNo}
                                popover={{ closeLabel: messages.comparison.close }}
                              />
                            </span>
                          ) : null}
                        </span>
                      </div>
                    )}

                    {isExpanded ? (
                      <div className={styles.rowBody}>
                        <AnswerGroup
                          icon={<AnswerMark tone="agree" size="small" />}
                          label={messages.results.answerYes}
                          positions={entry.yes}
                          you={userAnswer === true}
                        />
                        <AnswerGroup
                          icon={<AnswerMark tone="disagree" size="small" />}
                          label={messages.results.answerNo}
                          positions={entry.no}
                          you={userAnswer === false}
                        />
                        <AnswerGroup
                          icon={<AnswerMark tone="neutral" size="small" />}
                          label={messages.comparison.groupOther}
                          positions={entry.other}
                          you={userAnswer === null || userAnswer === undefined}
                          withMark
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </AppShell>
  );
}
