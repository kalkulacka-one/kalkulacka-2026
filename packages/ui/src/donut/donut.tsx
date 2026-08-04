import styles from './donut.module.css';

export type DonutSegment = {
  tone: 'agree' | 'disagree' | 'neutral' | 'none';
  value: number;
  label: string;
};

export type DonutProps = {
  segments: DonutSegment[];
  /** The figure in the hole — usually the total. */
  centerValue: string;
  /** Its caption, e.g. "otázek". */
  centerLabel: string;
  /** Outer diameter in px. */
  size?: number;
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Units of arc dropped between segments so two adjacent colours stay legible. */
const GAP = 3;

/**
 * How the answers split, as one ring.
 *
 * The counterpart to the bars elsewhere on the dashboard: those compare parties
 * against each other, this one shows a single whole divided up, which is the
 * shape a proportion of a fixed 42 questions actually has. Segments carry the
 * same four tones as the answer marks, so the ring is readable against the recap
 * without a colour key.
 *
 * Segments worth nothing are dropped rather than drawn as zero-length arcs,
 * which would otherwise show up as stray dots where their gaps fall.
 */
export function Donut({ segments, centerValue, centerLabel, size = 132 }: DonutProps) {
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);

  let cumulative = 0;

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className={styles.svg} aria-hidden="true">
        <circle className={styles.track} cx="50" cy="50" r={RADIUS} />

        {total > 0
          ? visible.map((segment) => {
              const arc = (segment.value / total) * CIRCUMFERENCE;
              // A lone segment is a full ring; giving it a gap would cut a
              // notch in something that has no neighbour to be separated from.
              const drawn = visible.length > 1 ? Math.max(arc - GAP, 0.5) : arc;
              const offset = cumulative;
              cumulative += arc;

              return (
                <circle
                  key={segment.tone}
                  className={`${styles.segment} ${styles[segment.tone]}`}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
                  strokeDashoffset={-offset}
                />
              );
            })
          : null}
      </svg>

      <div className={styles.center}>
        <span className={styles.value}>{centerValue}</span>
        <span className={styles.label}>{centerLabel}</span>
      </div>
    </div>
  );
}
