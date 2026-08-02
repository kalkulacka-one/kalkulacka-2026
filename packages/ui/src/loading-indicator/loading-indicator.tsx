import styles from './loading-indicator.module.css';

export type LoadingIndicatorProps = {
  /** What is being waited for, e.g. "Počítáme vaši shodu" — announced, not decorative. */
  label: string;
};

/**
 * The wait before the results.
 *
 * Three dots built from the icon family's one filled element, so the loader
 * belongs to the same drawing as everything else. Under `prefers-reduced-motion`
 * the animation stops (see the module CSS) and the dots simply sit there — the
 * label is what actually carries the meaning.
 */
export function LoadingIndicator({ label }: LoadingIndicatorProps) {
  return (
    <div className={styles.wrap} role="status">
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
