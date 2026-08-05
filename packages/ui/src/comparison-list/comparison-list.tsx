import { AnswerMark, type AnswerMarkTone } from '../answer-mark/answer-mark';
import { Icon } from '../icon/icon';
import styles from './comparison-list.module.css';

export type ComparisonRow = {
  questionId: string;
  statement: string;
  /** The user's recorded position. */
  user: { tone: AnswerMarkTone; label: string };
  /** The candidate's. */
  candidate: { tone: AnswerMarkTone; label: string };
  /** Whether the two agreed. `'none'` when one side didn't answer. */
  agreement: 'match' | 'mismatch' | 'none';
  /** The user marked this one "pro mě důležité". */
  important?: boolean;
  /** The candidate's own justification, where they left one. */
  comment?: string;
};

export type ComparisonListProps = {
  rows: ComparisonRow[];
  labels: {
    /** Column heading over the user's answers, e.g. "Vy". */
    you: string;
    /** Column heading over the candidate's — usually their short name. */
    candidate: string;
    /** Accessible marker for a starred question, e.g. "Pro mě důležité". */
    important: string;
  };
  /**
   * Changing this remounts the row list, replaying its entrance animation —
   * the same `key={filter}` trick the recap uses so switching "Shody" to
   * "Neshody" reads as a new result landing rather than a silent swap.
   */
  resetKey?: string | number;
};

/**
 * Answer-by-answer, the user against one candidate.
 *
 * The two positions lead the row as a pair of marks in fixed columns, so 42 rows
 * can be read straight down — where the two circles differ is the whole point of
 * the screen, and that pattern only emerges if they line up. They are the same
 * marks the recap uses, at the smaller size.
 *
 * Rows keep their original question order rather than being sorted by agreement:
 * this is a record of what was asked, and re-ordering it would make a candidate
 * look better or worse depending on which end you read first.
 */
export function ComparisonList({ rows, labels, resetKey }: ComparisonListProps) {
  return (
    <div className={styles.wrap}>
      {/*
        The candidate's column heading is allowed to run across the statement
        column rather than being truncated to the width of its circle: archive
        party names reach 85 characters, and clipping one to "SPOLEČN…" in the
        heading that identifies whose answers these are is worse than letting it
        extend into empty space. "Vy" needs no such room — it stays put in the
        one column it labels, which is what keeps this heading a single line
        instead of the two the previous, fully-overlapping layout wrapped to.
      */}
      <div className={styles.head} aria-hidden="true">
        <span className={styles.headCandidate}>{labels.candidate}</span>
        <span className={styles.headYou}>{labels.you}</span>
      </div>

      <ul className={styles.list} key={resetKey}>
        {rows.map((row) => (
          <li key={row.questionId} className={styles.row}>
            <p className={styles.statement}>
              {/* The design system's own star — the same heavy mark the question
                  card and the recap wear for "pro mě důležité", not a text
                  asterisk standing in for it. */}
              {row.important ? <Icon name="star" size={13} filled className={styles.star} /> : null}
              {row.statement}
              {row.important ? <span className={styles.srOnly}> ({labels.important})</span> : null}
            </p>

            <AnswerMark
              tone={row.candidate.tone}
              label={`${labels.candidate}: ${row.candidate.label}`}
              size="small"
            />
            <AnswerMark
              tone={row.user.tone}
              label={`${labels.you}: ${row.user.label}`}
              size="small"
            />

            {/*
              A grid child in its own right rather than nested under the
              statement: on a narrow screen it takes the full row, including the
              space beneath the marks, instead of being squeezed into the same
              column as the question it answers.
            */}
            {row.comment ? <p className={styles.comment}>{row.comment}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
