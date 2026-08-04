import styles from './meter.module.css';

export type MeterProps = {
  /** 0–100. Values outside the range are clamped rather than overflowing the track. */
  value: number;
  /**
   * Which ink the fill uses. `agree` is the match colour; `neutral` is for bars
   * that rank something without taking a side.
   */
  tone?: 'agree' | 'neutral';
  size?: 'small' | 'medium';
  /**
   * Seconds to wait before growing from zero. The results list staggers these so
   * the bars arrive with their rows. Ignored under `prefers-reduced-motion`.
   */
  delay?: number;
  /**
   * Decorative by default: the percentage is almost always text within a few
   * pixels of the bar, and announcing both reads the same number twice. Pass a
   * label only where the bar is genuinely the sole statement of the value.
   */
  label?: string;
};

/** A horizontal proportion — the match percentage, and the dashboard's topic rows. */
export function Meter({ value, tone = 'agree', size = 'medium', delay = 0, label }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`${styles.track} ${styles[size]}`}
      {...(label
        ? {
            role: 'meter',
            'aria-valuenow': Math.round(clamped),
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-label': label,
          }
        : { 'aria-hidden': 'true' })}
    >
      <div
        className={`${styles.fill} ${styles[tone]}`}
        style={{ width: `${clamped}%`, animationDelay: delay ? `${delay}s` : undefined }}
      />
    </div>
  );
}
