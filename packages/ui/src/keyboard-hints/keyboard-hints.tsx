import styles from './keyboard-hints.module.css';

export type KeyboardHint = {
  /** Rendered as separate `<kbd>` chips, e.g. `['←', '→']`. */
  keys: string[];
  label: string;
};

export type KeyboardHintsProps = {
  hints: KeyboardHint[];
};

/**
 * A quiet reference row for the keyboard shortcuts, shown only where there's
 * both a keyboard and room for it (see the module CSS breakpoint). Purely
 * informational — no interactive elements, so it costs nothing in the tab
 * order — but left in the accessibility tree rather than `aria-hidden`,
 * since a keyboard user is exactly who benefits from it existing.
 */
export function KeyboardHints({ hints }: KeyboardHintsProps) {
  return (
    <div className={styles.hints}>
      {hints.map((hint) => (
        <span key={hint.label} className={styles.hint}>
          <span className={styles.keys}>
            {hint.keys.map((key) => (
              <kbd key={key} className={styles.key}>
                {key}
              </kbd>
            ))}
          </span>
          {hint.label}
        </span>
      ))}
    </div>
  );
}
