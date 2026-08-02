'use client';

import { type InputHTMLAttributes, useId } from 'react';
import { Icon } from '../icon/icon';
import styles from './search-field.module.css';

export type SearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  /** Visible label. Pass `hideLabel` when the placeholder already says it. */
  label: string;
  hideLabel?: boolean;
  placeholder?: string;
  /** Accessible name for the clear button; the button only appears when there's a value. */
  clearLabel: string;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'className' | 'placeholder'
>;

/**
 * A filter box.
 *
 * `type="search"` rather than `text` so mobile keyboards offer a search key and
 * assistive tech announces it correctly — but the browser's own clear affordance
 * is suppressed in the CSS, because it is invisible on some platforms and
 * unstyleable on all of them. The clear button here is a real one.
 */
export function SearchField({
  value,
  onValueChange,
  label,
  hideLabel = false,
  placeholder,
  clearLabel,
  ...rest
}: SearchFieldProps) {
  const id = useId();

  return (
    <div className={styles.field}>
      <label className={hideLabel ? styles.labelHidden : styles.label} htmlFor={id}>
        {label}
      </label>

      <div className={styles.control}>
        <Icon name="search" size={18} className={styles.lens} />

        <input
          id={id}
          className={styles.input}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
          {...rest}
        />

        {value ? (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onValueChange('')}
            aria-label={clearLabel}
          >
            <Icon name="crossThin" size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
