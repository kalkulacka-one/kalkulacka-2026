import styles from './progress-segments.module.css';

/** How a single question reads in the progress bar. */
export type SegmentState = 'unanswered' | 'agree' | 'disagree' | 'skipped';

export type Segment = {
  state: SegmentState;
  /** Marked "pro mě důležité" — shown as a dot under the segment. */
  important?: boolean;
};

export type ProgressSegmentsProps = {
  segments: Segment[];
  /** Index of the question currently on screen. */
  currentIndex: number;
  /** Accessible label, e.g. "Otázka 3 ze 42". Supplied by the caller. */
  label: string;
};

/**
 * One segment per question, coloured by the answer given.
 *
 * Presentational only — it takes an already-derived list rather than answers,
 * so the mapping from domain answers to visual state stays testable in @vk/core.
 */
export function ProgressSegments({ segments, currentIndex, label }: ProgressSegmentsProps) {
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={segments.length}
      aria-valuenow={currentIndex + 1}
    >
      {segments.map((segment, index) => {
        const isCurrent = index === currentIndex;
        const classes = [
          styles.segment,
          segment.state !== 'unanswered' ? styles[segment.state] : undefined,
          isCurrent ? styles.current : undefined,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are a fixed positional list.
          <div key={index} className={classes}>
            <div className={styles.bar} />
            {segment.important ? <span className={styles.importantDot} /> : null}
          </div>
        );
      })}
    </div>
  );
}
