import { AnswerMark, type AnswerMarkTone } from '../answer-mark/answer-mark';
import { PercentMark } from '../logo/logo';
import styles from './calculating.module.css';

export type CalculatingProps = {
  /** What is being waited for, e.g. "Počítáme vaši shodu" — announced, not decorative. */
  label: string;
};

/**
 * The tape. Fixed rather than random so the animation is identical on the server
 * and the client, and identical between two people comparing screens — it is
 * decoration standing in for the answers, not a reading of them.
 */
const TAPE: { id: string; tone: AnswerMarkTone }[] = (
  [
    'agree',
    'disagree',
    'agree',
    'agree',
    'neutral',
    'disagree',
    'agree',
    'none',
    'disagree',
    'agree',
    'agree',
    'disagree',
    'neutral',
    'agree',
    'disagree',
    'agree',
    'agree',
    'none',
    'disagree',
    'agree',
    'neutral',
    'disagree',
    'agree',
    'agree',
  ] as AnswerMarkTone[]
).map((tone, index) => ({ id: `frame-${index}`, tone }));

/**
 * The wait before the results.
 *
 * Your answers run through a gate on a strip of film while a ring counts around
 * it, and the whole thing resolves onto the percent sign out of the wordmark.
 * The pause it fills is not fake work — the calculation finishes before the
 * screen paints — it is the beat that lets someone register the result was
 * produced *from their answers* rather than having been sitting there all along.
 *
 * Under `prefers-reduced-motion` nothing moves: the percent mark is simply
 * there, and the label carries the meaning. See the module CSS.
 */
export function Calculating({ label }: CalculatingProps) {
  return (
    <div className={styles.wrap} role="status">
      <div className={styles.stage}>
        <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
          <circle className={styles.ringTrack} cx="50" cy="50" r="45" />
          <circle className={styles.ringFill} cx="50" cy="50" r="45" />
        </svg>

        <div className={styles.gate} aria-hidden="true">
          {/* Sprocket holes, top and bottom, running at the tape's own speed —
              they are what makes the strip read as film being pulled through
              rather than as icons sliding sideways. */}
          <div className={`${styles.sprockets} ${styles.top}`}>
            {TAPE.map((frame) => (
              <span key={frame.id} className={styles.hole} />
            ))}
          </div>

          <div className={styles.tape}>
            {TAPE.map((frame) => (
              /* No labels: the strip stands in for the answers, it does not
                 report them, and this whole region is hidden from assistive tech
                 anyway. Naming all 24 would put a run of nonsense words in front
                 of the one sentence that means something. */
              <AnswerMark key={frame.id} tone={frame.tone} size="medium" />
            ))}
          </div>

          <div className={`${styles.sprockets} ${styles.bottom}`}>
            {TAPE.map((frame) => (
              <span key={frame.id} className={styles.hole} />
            ))}
          </div>
        </div>

        <PercentMark className={styles.percent} size={34} />
      </div>

      <p className={styles.label}>{label}</p>
    </div>
  );
}
