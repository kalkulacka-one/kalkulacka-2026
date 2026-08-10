import type { ElementType, ReactNode } from 'react';
import { Icon } from '../icon/icon';
import styles from './option-row.module.css';

export type OptionRowProps = {
  /** The main line — a municipality name, a candidate, a step. */
  label: string;
  /** A quieter second line: district code, election, "42 otázek". */
  meta?: string;
  /** A leading badge — the senate district's number, or an avatar. */
  leading?: ReactNode;
  /** `'a'` for a link, `'button'` for an action. Rendered as a link by default. */
  as?: ElementType;
  href?: string;
  onClick?: () => void;
  /** Present but not selectable — e.g. a city whose data does not exist yet. */
  disabled?: boolean;
  /**
   * The one a keyboard shortcut elsewhere on the screen is about to activate —
   * a search field's Enter jumping to the top result, say. Focus itself stays
   * in that field, so this can't be conveyed by `:focus-visible`; the row
   * needs to look targeted without actually holding focus.
   */
  highlighted?: boolean;
  /**
   * For a row that lives in a roving-tabindex list (`OptionRowList`): `0` for
   * the one row Tab should reach, `-1` for the rest. Left unset for a row
   * outside such a list, which just takes the browser's own tab order.
   */
  tabIndex?: number;
};

/**
 * One selectable row in a list.
 *
 * The chevron is decorative: the row itself is the control, so the whole thing
 * is one tap target rather than a row with a small affordance at the end of it.
 */
export function OptionRow({
  label,
  meta,
  leading,
  as: Component = 'a',
  href,
  onClick,
  disabled = false,
  highlighted = false,
  tabIndex,
}: OptionRowProps) {
  // A disabled row stops being a control rather than staying one that rejects
  // clicks: a dead link is still focusable and still announced as a link.
  const Element = disabled ? 'div' : Component;

  return (
    <Element
      className={`${styles.row} ${disabled ? styles.disabled : ''} ${highlighted ? styles.highlighted : ''}`}
      href={disabled ? undefined : href}
      onClick={disabled ? undefined : onClick}
      type={!disabled && Component === 'button' ? 'button' : undefined}
      aria-disabled={disabled ? true : undefined}
      tabIndex={disabled ? undefined : tabIndex}
    >
      {leading ? <span className={styles.leading}>{leading}</span> : null}

      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </span>

      {disabled ? null : <Icon name="chevronRightThin" size={18} className={styles.chevron} />}
    </Element>
  );
}
