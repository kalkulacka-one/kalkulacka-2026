'use client';

import {
  type AnswerValue,
  answerTone,
  buildRecapFilters,
  countRecapTotals,
  filterRecapQuestions,
  type Question,
  RECAP_FILTER_ALL,
  type RecapFilterId,
} from '@vk/core';
import { format, getMessages } from '@vk/i18n';
import { Button, FilterChips, QuestionDialog, RecapRow, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnswersReady, useAnswersStore, useCalculatorAnswers } from '../lib/answers-store';
import { type CalculatorShellInfo, questionPath, stepPath } from '../lib/paths';
import { toCardContent } from '../lib/question-content';
import { AppShell } from './app-shell';
import { BackLink } from './back-link';
import styles from './recap.module.css';

export type RecapProps = {
  calculator: CalculatorShellInfo;
  questions: Question[];
};

const messages = getMessages();

/**
 * Every question at once — as a list you scan, not a stack you re-read.
 *
 * Two things shape this screen. First, edits go straight to the same store the
 * deck writes to, so this is a second *view* of the answers rather than a copy:
 * there is no save step and no way for the two screens to disagree. Second, the
 * screen does not scroll — only the list inside it does. The deck is a fixed,
 * balanced composition, and a recap that scrolled the title and the call to
 * action off the top made the step after it feel like a different product.
 */
export function Recap({ calculator, questions }: RecapProps) {
  const { id: calculatorId, electionKey, district, embed } = calculator;
  const ready = useAnswersReady();
  const answers = useCalculatorAnswers(calculatorId);
  const setAnswer = useAnswersStore((s) => s.setAnswer);
  const skipQuestion = useAnswersStore((s) => s.skipQuestion);
  const toggleImportant = useAnswersStore((s) => s.toggleImportant);

  const [filter, setFilter] = useState<RecapFilterId>(RECAP_FILTER_ALL);
  /** The question the dialog is showing, as an index into `questions`. */
  const [openIndex, setOpenIndex] = useState<number | undefined>();

  /** Whether the list has been scrolled away from its top edge — drives the top blur (there's more above). */
  const [scrolled, setScrolled] = useState(false);
  /**
   * On a phone, the header (back link, title, description, tally) collapses
   * to just the filter row while scrolling forward through the list, and
   * re-expands the moment the scroll reverses — the common "toolbar hides
   * advancing, reappears on the way back" pattern, not merely "hidden until
   * you're back at the very top". `lastScrollTopRef` is what makes it
   * direction-aware rather than distance-from-top-aware.
   */
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const lastScrollTopRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    const top = el?.scrollTop ?? 0;
    setScrolled(top > 4);

    // A dead zone at *both* ends, not just the top: the elastic overscroll
    // bounce at the bottom of the list reports a few small reverse-direction
    // scroll events while it springs back, and without this a scroll that
    // simply reaches the end reads as "scrolled up" and flickers the header
    // back open for a frame before it re-collapses.
    const maxTop = el ? el.scrollHeight - el.clientHeight : 0;
    if (top <= 24) {
      setHeaderCollapsed(false);
      lastScrollTopRef.current = top;
      return;
    }
    if (top >= maxTop - 24) {
      lastScrollTopRef.current = top;
      return;
    }

    const delta = top - lastScrollTopRef.current;
    if (delta > 8) setHeaderCollapsed(true);
    else if (delta < -8) setHeaderCollapsed(false);
    lastScrollTopRef.current = top;
  }, []);

  const ref = { electionKey, district, embed };

  /*
   * Warm the results route while the recap is being read. The CTA is a
   * `<Link>`, but auto-prefetch for a dynamic route is not a given across
   * Next versions/deployments — and the screen after this one opens on a
   * loading animation that should start the moment the button is pressed,
   * not after an RSC round-trip. Explicit is cheap. (No-op in dev.)
   */
  const router = useRouter();
  useEffect(() => {
    router.prefetch(stepPath({ electionKey, district, embed }, 'result'));
  }, [router, electionKey, district, embed]);

  // Which questions a filter leaves, and what each chip counts, is @vk/core's
  // to decide — this screen only lays the answer out.
  const { answered, remaining } = countRecapTotals(questions, answers);

  const options = buildRecapFilters(questions, answers, {
    all: messages.recap.filterAll,
    unanswered: messages.recap.filterUnanswered,
    important: messages.recap.filterImportant,
  });

  const visible = filterRecapQuestions(questions, answers, filter);

  const openQuestion = openIndex === undefined ? undefined : questions[openIndex];
  const openAnswer = openQuestion ? answers[openQuestion.id] : undefined;

  const handleAnswer = (agree: boolean) => {
    if (!openQuestion) return;

    // Re-choosing the same answer clears it — an undo, not a decision — so the
    // dialog stays open to show the row's mark go empty. Same rule the deck
    // uses to decide whether an answer counts as progress.
    const isClearing = openAnswer?.answer === agree;
    setAnswer(calculatorId, openQuestion.id, agree);
    if (!isClearing) setOpenIndex(undefined);
  };

  const handleSkip = () => {
    if (!openQuestion) return;
    skipQuestion(calculatorId, openQuestion.id);
    setOpenIndex(undefined);
  };

  return (
    <AppShell calculator={calculator}>
      <main className={styles.screen}>
        <div className={styles.inner}>
          {/*
            Collapses to just the filter row below while scrolling forward on
            a phone (`data-collapsed`, mobile-only in the CSS) — the grid
            wrapping `.headerInner` is what lets that animate to and from an
            unknown content height instead of a guessed `max-height`.
          */}
          <header className={styles.header} data-collapsed={headerCollapsed || undefined}>
            <div className={styles.headerInner}>
              <BackLink
                href={questionPath(ref, questions.length)}
                label={messages.recap.backToQuestions}
              />

              <div className={styles.headline}>
                <div className={styles.titles}>
                  <h1 className={styles.title}>{messages.recap.title}</h1>
                  <p className={styles.description}>{messages.recap.description}</p>
                </div>

                {/*
                  The tally sits beside the title on a wide screen rather than
                  under it: it is the answer to "am I done?", and putting it on
                  the same line as the question makes the header one statement
                  instead of four stacked ones.
                */}
                <p className={styles.tally}>
                  <span className={styles.count}>
                    {format(messages.recap.summary, { answered, total: questions.length })}
                  </span>
                  {remaining > 0 ? (
                    <span className={styles.muted}>
                      {format(messages.recap.remainingShort, { remaining })}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </header>

          <div className={styles.filters}>
            <FilterChips
              label={messages.recap.filterLabel}
              options={options}
              value={filter}
              onChange={setFilter}
            />
          </div>

          <div className={styles.listShell}>
            {visible.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyText}>{messages.recap.emptyFilter}</p>
                <Button variant="outline" size="small" onClick={() => setFilter(RECAP_FILTER_ALL)}>
                  {messages.recap.emptyFilterAction}
                </Button>
              </div>
            ) : (
              <>
                {/* Only there to say "there's more above" — invisible at rest,
                    faded in once the list has actually moved. */}
                <div
                  className={styles.topFade}
                  data-visible={scrolled || undefined}
                  aria-hidden="true"
                />

                <div ref={listRef} className={styles.listWrap} onScroll={handleScroll}>
                  {/* Keyed on the filter so switching it replays the entrance
                      animation — the rows on screen after a filter change are a
                      new result, not a continuation of the old list. */}
                  <ul className={styles.list} key={filter}>
                    {visible.map(({ question, index }) => {
                      const answer = answers[question.id];

                      return (
                        <RecapRow
                          key={question.id}
                          title={question.title}
                          tone={answerTone(answer?.answer)}
                          important={answer?.isImportant === true}
                          skipped={answer?.skipped === true}
                          labels={{
                            answer: answerLabel(answer?.answer),
                            important: messages.flow.important,
                          }}
                          onOpen={() => setOpenIndex(index)}
                          onToggleImportant={() => toggleImportant(calculatorId, question.id)}
                        />
                      );
                    })}
                  </ul>
                </div>

                {/* Taller than the list's own bottom padding and blurred, so the
                    control panel below reads as floating over the list rather
                    than sitting in a lane of its own underneath it. */}
                <div className={styles.bottomFade} aria-hidden="true" />
              </>
            )}

            <div className={styles.footer}>
              <StickyBar>
                {/*
                  With nothing answered there is nothing to compare, so the control
                  is a genuinely disabled button rather than a link wearing
                  `aria-disabled` — which would still navigate on click.
                */}
                {ready && answered === 0 ? (
                  <Button size="large" iconEnd="arrowRight" disabled>
                    {messages.recap.showResults}
                  </Button>
                ) : (
                  <Button
                    as={Link}
                    href={stepPath(ref, 'result')}
                    size="large"
                    iconEnd="arrowRight"
                  >
                    {messages.recap.showResults}
                  </Button>
                )}
              </StickyBar>
            </div>
          </div>
        </div>
      </main>

      <QuestionDialog
        question={openQuestion ? toCardContent(openQuestion) : undefined}
        selection={{
          agree: openAnswer?.answer === true,
          disagree: openAnswer?.answer === false,
          important: openAnswer?.isImportant === true,
        }}
        labels={{
          agree: messages.flow.agree,
          disagree: messages.flow.disagree,
          important: messages.flow.important,
          skip: messages.flow.skip,
          close: messages.flow.close,
        }}
        onClose={() => setOpenIndex(undefined)}
        onAnswer={handleAnswer}
        onSkip={handleSkip}
        onToggleImportant={() => openQuestion && toggleImportant(calculatorId, openQuestion.id)}
      />
    </AppShell>
  );
}

function answerLabel(answer: AnswerValue | undefined): string {
  if (answer === true) return messages.flow.agree;
  if (answer === false) return messages.flow.disagree;
  return messages.recap.noAnswer;
}
