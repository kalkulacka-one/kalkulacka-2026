'use client';

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';

export type OptionRowListHandle = {
  /** Moves real focus to the first row — the search field's ArrowDown handoff into the list. */
  focusFirst: () => void;
  /**
   * Brings the active row into view without moving focus — for the moment a
   * filter changes which row holds the roving slot while focus is still up
   * in the search field.
   */
  scrollActiveIntoView: () => void;
};

export type OptionRowListProps = {
  /** `<li>`-wrapped `OptionRow` links, in the order the roving slot should move through. */
  children: ReactNode;
  className?: string;
  /**
   * Index of the row currently holding the roving `tabIndex={0}` slot — the
   * caller's own state, not this component's. It has to mean something (what
   * a search field's Enter would target, which row Tab reaches) even while
   * nothing in the list is actually focused, so the caller owns it the same
   * way `SearchField` owns its own `value`.
   */
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  ref?: Ref<OptionRowListHandle>;
};

const ROVING_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

/**
 * A roving-tabindex list of `OptionRow` links.
 *
 * Deliberately not `role="listbox"`: every row here really is a navigation
 * link with a real `href`, so keeping native link semantics honest is better
 * than borrowing a widget role that promises single-selection state this
 * list doesn't have. What a listbox pattern gives for free — Tab reaching
 * the list as a single stop, arrows walking through it — is built by hand
 * instead: the caller marks exactly one row `tabIndex={0}` (`activeIndex`)
 * and the rest `-1`, and this component moves both that slot and real focus
 * together on ArrowUp/ArrowDown/Home/End.
 *
 * Stops at the ends rather than wrapping. The APG's own listbox pattern
 * defaults to no wrap, and it is the right read here specifically because a
 * search field sits right above this list — looping from the last row back
 * to the first would be a shorter trip than Shift+Tab back to where the user
 * was typing, and that is not the trip ArrowDown at the bottom row should
 * take.
 *
 * Only `a[href]` counts as a row to move between. An unavailable district
 * renders as a plain, non-interactive `<div>` (see `OptionRow`) rather than
 * a disabled link, so this query already skips it — arrows treat it exactly
 * like the empty space it visually isn't, with no separate case needed.
 */
export function OptionRowList({
  children,
  className,
  activeIndex,
  onActiveIndexChange,
  ref,
}: OptionRowListProps) {
  const containerRef = useRef<HTMLUListElement>(null);

  const rows = useCallback(
    () => Array.from(containerRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      focusFirst: () => rows()[0]?.focus(),
      scrollActiveIntoView: () => rows()[activeIndex]?.scrollIntoView({ block: 'nearest' }),
    }),
    [rows, activeIndex],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLUListElement>) => {
      if (!ROVING_KEYS.has(event.key)) return;

      const list = rows();
      if (list.length === 0) return;

      const current = list.indexOf(document.activeElement as HTMLAnchorElement);
      // Focus is on something inside the `<ul>` that isn't one of its rows —
      // shouldn't happen given what this list renders, but leaving the key
      // alone is safer than guessing where it should go.
      if (current === -1) return;

      let next = current;
      if (event.key === 'ArrowDown') next = Math.min(current + 1, list.length - 1);
      else if (event.key === 'ArrowUp') next = Math.max(current - 1, 0);
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = list.length - 1;

      event.preventDefault();
      list[next]?.focus();
      onActiveIndexChange(next);
    },
    [rows, onActiveIndexChange],
  );

  // A row focused any other way — a click, or Shift+Tab back in from below —
  // becomes the roving slot too, so the next Tab into the list resumes there
  // instead of snapping back to whichever row held the slot before.
  const handleFocus = useCallback(() => {
    const current = rows().indexOf(document.activeElement as HTMLAnchorElement);
    if (current !== -1) onActiveIndexChange(current);
  }, [rows, onActiveIndexChange]);

  return (
    <ul ref={containerRef} className={className} onKeyDown={handleKeyDown} onFocus={handleFocus}>
      {children}
    </ul>
  );
}
