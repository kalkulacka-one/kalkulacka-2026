import { Fragment } from 'react';
import { VisuallyHidden } from '../visually-hidden/visually-hidden';
import styles from './filter-chips.module.css';

export type FilterOption = {
  id: string;
  label: string;
  /** How many items this filter would leave. Hidden when undefined. */
  count?: number;
  /** Draws a hairline before this chip — separates groups of unlike filters. */
  separatorBefore?: boolean;
};

export type FilterChipsProps = {
  /** Names the group for assistive tech; not drawn. */
  label: string;
  options: FilterOption[];
  /** The `id` of the active option. Exactly one is always active. */
  value: string;
  onChange: (id: string) => void;
};

/**
 * A single-select row of filter chips.
 *
 * Toggle buttons rather than radios: the row scrolls sideways on a phone, and
 * arrow keys inside a radiogroup would fight the horizontal scroll they also
 * control. `aria-pressed` on plain buttons keeps the state announced without
 * claiming a keyboard model this doesn't implement.
 */
export function FilterChips({ label, options, value, onChange }: FilterChipsProps) {
  return (
    // The container the CSS queries to decide between scrolling and wrapping —
    // its own width, not the viewport's, since an embed can be narrow inside a
    // wide page.
    <div className={styles.host}>
      <div className={styles.scroller}>
        {/* A real `<fieldset>`/`<legend>` pair rather than `role="group"` — the
            grouping is native, so it needs no ARIA to be announced. */}
        <fieldset className={styles.row}>
          <VisuallyHidden as="legend">{label}</VisuallyHidden>

          {options.map((option) => (
            <Fragment key={option.id}>
              {option.separatorBefore ? (
                <span className={styles.divider} aria-hidden="true" />
              ) : null}

              <button
                type="button"
                className={styles.chip}
                aria-pressed={option.id === value}
                onClick={() => onChange(option.id)}
              >
                {option.label}
                {option.count === undefined ? null : (
                  <span className={styles.count}>{option.count}</span>
                )}
              </button>
            </Fragment>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
