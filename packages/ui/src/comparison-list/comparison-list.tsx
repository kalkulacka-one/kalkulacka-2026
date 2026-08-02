import { AnswerPill, type AnswerTone } from '../answer-pill/answer-pill';
import { Icon } from '../icon/icon';
import styles from './comparison-list.module.css';

export type ComparisonRow = {
  questionId: string;
  statement: string;
  /** The user's recorded position. */
  user: { tone: AnswerTone; label: string };
  /** The candidate's. */
  candidate: { tone: AnswerTone; label: string };
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
};

/**
 * Answer-by-answer, the user against one candidate.
 *
 * Rows keep their original question order rather than being sorted by agreement:
 * this is a record of what was asked, and re-ordering it would make a candidate
 * look better or worse depending on which end you read first.
 */
export function ComparisonList({ rows, labels }: ComparisonListProps) {
  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.questionId} className={`${styles.row} ${styles[row.agreement]}`}>
          <p className={styles.statement}>
            {row.important ? (
              <Icon name="starThin" size={14} filled className={styles.star} />
            ) : null}
            {row.statement}
            {row.important ? <span className={styles.srOnly}> ({labels.important})</span> : null}
          </p>

          <div className={styles.answers}>
            <span className={styles.side}>
              <span className={styles.who}>{labels.you}</span>
              <AnswerPill tone={row.user.tone} label={row.user.label} size="small" />
            </span>

            <span className={styles.side}>
              <span className={styles.who}>{labels.candidate}</span>
              <AnswerPill tone={row.candidate.tone} label={row.candidate.label} size="small" />
            </span>
          </div>

          {row.comment ? <p className={styles.comment}>{row.comment}</p> : null}
        </li>
      ))}
    </ul>
  );
}
