'use client';

import {
  type AnswerDistribution,
  MIN_TOPIC_ANSWERS,
  type QuestionConsensus,
  type TopicMatch,
} from '@vk/core';
import { format, getMessages } from '@vk/i18n';
import { AnswerMark, type AnswerMarkTone, Button, Donut, type DonutSegment, Meter } from '@vk/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/clipboard';
import styles from './results-dashboard.module.css';

const messages = getMessages();

export type ResultsDashboardProps = {
  distribution: AnswerDistribution;
  topics: TopicMatch[];
  important: QuestionConsensus[];
  againstTheGrain: QuestionConsensus[];
  /** Pre-assembled by `buildAiPrompt` — this component only offers it. */
  prompt: string;
};

function toneOf(answer: boolean | null): AnswerMarkTone {
  if (answer === true) return 'agree';
  if (answer === false) return 'disagree';
  return 'neutral';
}

function answerLabelOf(answer: boolean | null): string {
  if (answer === true) return messages.results.answerYes;
  if (answer === false) return messages.results.answerNo;
  return messages.results.answerNeutral;
}

/** A question with how much company you had on it — shared by two of the cards. */
function ConsensusRow({ entry }: { entry: QuestionConsensus }) {
  const { dashboard } = messages.results;
  const share = entry.respondedCount > 0 ? (entry.agreeing.length / entry.respondedCount) * 100 : 0;

  return (
    <li className={styles.consensusRow}>
      <AnswerMark
        tone={toneOf(entry.userAnswer)}
        label={answerLabelOf(entry.userAnswer)}
        size="small"
      />

      <div className={styles.consensusBody}>
        <p className={styles.consensusTitle}>{entry.question.title}</p>
        <Meter value={share} tone="neutral" size="small" />
        <p className={styles.consensusCount}>
          {format(dashboard.agreeCount, {
            agreeing: entry.agreeing.length,
            responded: entry.respondedCount,
          })}
        </p>
      </div>
    </li>
  );
}

/**
 * What the results screen shows before you pick anybody.
 *
 * The right pane would otherwise sit empty until a party is chosen, and the
 * ranking on its own answers only the narrowest version of the question someone
 * came here with. These cards are about the shape of the answers rather than the
 * order of the parties: which topics you actually have a position on, where you
 * stood nearly alone, and what the whole thing looks like as one figure.
 */
export function ResultsDashboard({
  distribution,
  topics,
  important,
  againstTheGrain,
  prompt,
}: ResultsDashboardProps) {
  const { dashboard } = messages.results;
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Clears itself so the button doesn't sit reading "Zkopírováno" forever, which
  // stops it looking like a button you can press again.
  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = window.setTimeout(
      () => setCopyState('idle'),
      copyState === 'failed' ? 6000 : 2400,
    );
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const copyPrompt = useCallback(async () => {
    if (await copyText(prompt)) {
      setCopyState('done');
      return;
    }

    /*
     * The clipboard is refusable, and absent entirely on a plain-http origin.
     * Rather than leave a dead button, hand the reader the next best thing:
     * the text selected and ready for their own copy gesture.
     */
    setCopyState('failed');
    promptRef.current?.focus();
    promptRef.current?.select();
  }, [prompt]);

  const segments: DonutSegment[] = [
    { tone: 'agree', value: distribution.agree, label: dashboard.legendAgree },
    { tone: 'disagree', value: distribution.disagree, label: dashboard.legendDisagree },
    { tone: 'neutral', value: distribution.neutral, label: dashboard.legendNeutral },
    { tone: 'none', value: distribution.unanswered, label: dashboard.legendUnanswered },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{dashboard.distributionTitle}</h3>

          <div className={styles.distribution}>
            <Donut
              segments={segments}
              centerValue={String(distribution.total)}
              centerLabel={dashboard.distributionUnit}
            />

            <ul className={styles.legend}>
              {segments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <li key={segment.tone} className={styles.legendItem}>
                    <span className={`${styles.swatch} ${styles[segment.tone]}`} />
                    <span className={styles.legendLabel}>{segment.label}</span>
                    <span className={styles.legendValue}>{segment.value}</span>
                  </li>
                ))}
            </ul>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{dashboard.topicsTitle}</h3>
          <p className={styles.cardSubtitle}>{dashboard.topicsSubtitle}</p>

          {topics.length > 0 ? (
            <>
              <ul className={styles.topics}>
                {topics.map((topic) => (
                  <li key={topic.topic} className={styles.topicRow}>
                    <span className={styles.topicName}>
                      {topic.topic}
                      <span className={styles.topicCount}>{topic.answeredCount}</span>
                    </span>

                    <Meter value={topic.best.matchPercentage} />

                    <span className={styles.topicBest}>
                      {topic.best.candidate.shortName}
                      <span className={styles.topicPercent}>
                        {Math.round(topic.best.matchPercentage)} %
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Said plainly rather than left to be inferred from the counts: a
                topic missing from this list is missing for a reason, and the
                reason is not that nobody matched you on it. */}
              <p className={styles.note}>
                {format(dashboard.topicsNote, { min: MIN_TOPIC_ANSWERS })}
              </p>
            </>
          ) : (
            <p className={styles.empty}>{dashboard.topicsEmpty}</p>
          )}
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{dashboard.importantTitle}</h3>
          <p className={styles.cardSubtitle}>{dashboard.importantSubtitle}</p>

          {important.length > 0 ? (
            <ul className={styles.consensusList}>
              {important.map((entry) => (
                <ConsensusRow key={entry.question.id} entry={entry} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{dashboard.importantEmpty}</p>
          )}
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>{dashboard.grainTitle}</h3>
          <p className={styles.cardSubtitle}>{dashboard.grainSubtitle}</p>

          {againstTheGrain.length > 0 ? (
            <ul className={styles.consensusList}>
              {againstTheGrain.map((entry) => (
                <ConsensusRow key={entry.question.id} entry={entry} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>{dashboard.grainEmpty}</p>
          )}
        </section>
      </div>

      {/* Outside the columns: a block of prose reads badly in a narrow measure,
          and it is the one card that concerns the whole screen rather than one
          slice of it. */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>{dashboard.promptTitle}</h3>
        <p className={styles.cardSubtitle}>{dashboard.promptSubtitle}</p>

        {/*
          A real textarea rather than a styled block: it is selectable, it scrolls
          on its own, and it keeps working when the clipboard API is refused or
          the page is not on a secure origin.
        */}
        <textarea
          ref={promptRef}
          className={styles.prompt}
          value={prompt}
          readOnly
          rows={7}
          spellCheck={false}
        />

        <div className={styles.promptActions}>
          <Button variant="outline" size="small" onClick={copyPrompt}>
            {copyState === 'done' ? dashboard.promptCopied : dashboard.promptCopy}
          </Button>
          <p className={styles.note} role={copyState === 'failed' ? 'status' : undefined}>
            {copyState === 'failed' ? dashboard.promptFallback : dashboard.promptNote}
          </p>
        </div>
      </section>
    </div>
  );
}
