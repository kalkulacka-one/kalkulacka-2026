'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import styles from './menu.module.css';

export type MenuItem = {
  id: string;
  label: string;
  icon?: IconName;
  /** A second line, for an action whose consequence is worth spelling out. */
  detail?: string;
  onSelect: () => void;
};

export type MenuProps = {
  /** Accessible name for the trigger. */
  label: string;
  items: MenuItem[];
  icon?: IconName;
};

/**
 * The shell's overflow menu.
 *
 * Hand-rolled rather than built on the native popover API because aligning a
 * popover to its trigger still needs CSS anchor positioning, which only one
 * engine ships — and a menu that lands in the wrong corner on Safari is worse
 * than a few lines of positioning here.
 *
 * Selecting an item closes the menu *before* running the action, so an action
 * that opens a dialog does not have to fight this for focus — and it hands
 * focus back to the trigger on the way, which is what gives that dialog a live
 * element to restore to when it is dismissed.
 *
 * The panel is portaled to `document.body` rather than left as a child of the
 * trigger. This app bar sits in a `position: sticky` header with its own
 * z-index, and *any* stacking context — sticky, fixed, an animated transform —
 * caps every z-index inside it at that one slot from the outside. A page that
 * later stacks something above the bar (as the recap's sticky filter row
 * does) would bury the menu no matter how high its own z-index climbed, since
 * it was never competing at the page's level to begin with. Escaping to
 * `document.body` puts it in that top-level context for real, which is also
 * why its position is measured from the trigger (`getBoundingClientRect`)
 * instead of inherited via CSS.
 */
export function Menu({ label, items, icon = 'list' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Moving focus into the menu is what makes the arrow keys and Escape work
  // without a global key listener — the handlers below are all scoped to it.
  // Keyed on `open` *and* whether the trigger's position has been measured,
  // not `open` alone: the portaled panel (and this ref) doesn't exist yet on
  // the render where `open` first flips, only once `anchor` follows a beat
  // later. A boolean, not `anchor` itself, so re-measuring on scroll or
  // resize while the menu is already open doesn't drag focus back to the
  // first item mid-navigation.
  const isPositioned = anchor !== null;
  useEffect(() => {
    if (!open || !isPositioned) return;
    const first = listRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open, isPositioned]);

  // The portal severs the DOM link CSS used to rely on (`right: 0` against a
  // positioned ancestor), so the panel's corner is measured from the trigger
  // directly instead — and re-measured on anything that could move it, since
  // a fixed-position panel does not follow document scroll on its own.
  useLayoutEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }

    const measure = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setAnchor({ top: rect.bottom, right: window.innerWidth - rect.right });
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      // Two disjoint trees now that the panel is portaled: the trigger's own
      // wrapper, and the panel sitting directly under `<body>`.
      if (target instanceof Node) {
        if (rootRef.current?.contains(target)) return;
        if (panelRef.current?.contains(target)) return;
      }
      // A click that lands outside dismisses without stealing focus back —
      // whatever was clicked should get it instead.
      close(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, close]);

  const moveFocus = (delta: number) => {
    const nodes = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (nodes.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const current = active ? nodes.indexOf(active) : -1;
    const next = (current + delta + nodes.length) % nodes.length;
    nodes[next]?.focus();
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <IconButton
        ref={triggerRef}
        icon={icon}
        label={label}
        variant="surface"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      />

      {open && anchor
        ? createPortal(
            <div
              ref={panelRef}
              className={styles.anchor}
              style={{ top: anchor.top, right: anchor.right }}
            >
              <div
                id={menuId}
                ref={listRef}
                className={styles.list}
                role="menu"
                aria-label={label}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    close(true);
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveFocus(1);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveFocus(-1);
                  } else if (event.key === 'Tab') {
                    // Tab means "done here" — let it move on, just don't leave
                    // an orphaned menu open behind it.
                    close(false);
                  }
                }}
              >
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={styles.item}
                    /*
                     * Focus goes back to the trigger *before* the action runs,
                     * and the order is the whole point. The item is about to
                     * be unmounted, so leaving focus on it drops the caret to
                     * `<body>` — and a `showModal()` that happens next records
                     * `<body>` as the element to restore to, which is where a
                     * keyboard user ended up after every dismissal of the
                     * help, restart or leave sheet. Restoring first gives the
                     * modal a real trigger to hand focus back to, and for an
                     * action that opens nothing (the light/dark toggle) it is
                     * simply where focus belongs.
                     */
                    onClick={() => {
                      close(true);
                      item.onSelect();
                    }}
                  >
                    {item.icon ? (
                      <span className={styles.icon}>
                        <Icon name={item.icon} size={20} />
                      </span>
                    ) : null}

                    <span className={styles.text}>
                      <span className={styles.label}>{item.label}</span>
                      {item.detail ? <span className={styles.detail}>{item.detail}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
