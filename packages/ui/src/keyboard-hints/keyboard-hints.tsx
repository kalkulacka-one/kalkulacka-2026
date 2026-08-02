import { Icon, type IconName } from '../icon/icon';
import styles from './keyboard-hints.module.css';

/**
 * A key cap: either literal text (`','`) or an icon plus the name a screen
 * reader should read in its place. The name arrives as a prop rather than
 * from a lookup because this package holds no strings of its own.
 */
export type HintKey = string | { icon: IconName; label: string };

export type KeyboardHint = {
  /** Rendered as separate `<kbd>` chips, e.g. `[',', '.']`. */
  keys: HintKey[];
  label: string;
};

export type KeyboardHintsProps = {
  hints: KeyboardHint[];
};

function keyId(key: HintKey) {
  return typeof key === 'string' ? key : key.icon;
}

/**
 * A reference row for the keyboard shortcuts, shown only where there's both a
 * keyboard and room for it (see the module CSS breakpoint). Purely
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
              <kbd
                key={keyId(key)}
                className={styles.key}
                aria-label={typeof key === 'string' ? undefined : key.label}
              >
                {typeof key === 'string' ? key : <Icon name={key.icon} size={15} />}
              </kbd>
            ))}
          </span>
          {hint.label}
        </span>
      ))}
    </div>
  );
}
