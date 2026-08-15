'use client';

import {
  answerTone,
  buildRecapFilters,
  countRecapTotals,
  filterRecapQuestions,
  type Question,
  RECAP_FILTER_ALL,
  type RecapFilterId,
} from '@vk/core';
import { format, getMessages } from '@vk/i18n';
import { Button, EdgeFade, FilterChips, QuestionDialog, RecapRow } from '@vk/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { answerLabelOf } from '../lib/answer-labels';
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
 * call to action never leaves the screen: on a phone the page scrolls as a
 * document (the only arrangement iOS paints under its glass address bar — see
 * `recap.module.css`) with the button riding sticky above the bar, while on a
 * desktop the frame holds still and only the list inside it moves.
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

  /**
   * Whether the desktop's inner list box has been scrolled away from its top
   * edge — drives the top fade (there's more above). On a phone the box never
   * scrolls (the document does), so this stays false and the fade stays off;
   * the app bar's glass surface is the phone's "more above" cue instead.
   */
  const [scrolled, setScrolled] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    setScrolled((listRef.current?.scrollTop ?? 0) > 4);
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
    <AppShell
      calculator={calculator}
      /* The phone list must carry on under Safari's glass rather than stop in
         a line above it, and only a scrolling document gets to (`screen.tsx`
         records the same finding). The desktop's fixed frame comes back via
         the `64rem` rules in `globals.css`. */
      scroll="document"
    >
      <main className={styles.screen}>
        <div className={styles.inner}>
          {/* On a phone this simply scrolls away with the page; the sticky app
              bar above and the sticky action below are the parts that stay. */}
          <header className={styles.header}>
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
                <EdgeFade edge="top" visible={scrolled} />

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
                            answer: answerLabelOf(answer?.answer),
                            important: messages.flow.important,
                          }}
                          onOpen={() => setOpenIndex(index)}
                          onToggleImportant={() => toggleImportant(calculatorId, question.id)}
                        />
                      );
                    })}
                  </ul>
                </div>

                {/*
                  Desktop-only (the wrapper hides it below the desktop-frame
                  breakpoint): the band that settles rows under the floating
                  button in the fixed frame. On a phone there is no fade at all
                  — the raw list edge is what runs on under Safari's glass, and
                  a page-colour ramp there would end the screen in a dead strip
                  instead.
                */}
                <div className={styles.desktopFade}>
                  <EdgeFade edge="bottom" size="action" />
                </div>
              </>
            )}
          </div>

          {/*
            The control panel: sticky over the scrolling page on a phone,
            floating over the desktop fade band otherwise — the CSS holds both
            arrangements. Deliberately a bare button rather than `StickyBar`,
            whose phone scrim would paint a solid tail exactly over the
            under-glass strip the document arrangement exists to leave open.
          */}
          <div className={styles.footer}>
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
              <Button as={Link} href={stepPath(ref, 'result')} size="large" iconEnd="arrowRight">
                {messages.recap.showResults}
              </Button>
            )}
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
          agree: messages.answer.yes,
          disagree: messages.answer.no,
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
