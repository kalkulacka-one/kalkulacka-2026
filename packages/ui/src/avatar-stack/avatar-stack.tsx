'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Avatar } from '../avatar/avatar';
import { IconButton } from '../icon-button/icon-button';
import { VisuallyHidden } from '../visually-hidden/visually-hidden';
import styles from './avatar-stack.module.css';

export type AvatarStackItem = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type AvatarStackProps = {
  items: AvatarStackItem[];
  /** How many faces are drawn before the rest collapse into a "+n" disc. */
  max?: number;
  size?: 'small' | 'medium';
  /** Names the whole group for a screen reader, e.g. "Strany, které s vámi souhlasí". */
  label: string;
  /**
   * When provided, the stack becomes a trigger for a popover that captions
   * every face: hovering shows it on a mouse, tapping toggles it elsewhere,
   * and `closeLabel` names the popover's own X. Without it the stack stays
   * the inert row it always was.
   */
  popover?: { closeLabel: string };
};

/**
 * A row of candidate faces, overlapped.
 *
 * A count ("souhlasí 7 z 12 stran") says how much company you had; this says
 * *whose*. Overlapping rather than spacing them out is what keeps a dozen
 * parties inside a dashboard card's width, and the ring each avatar carries is
 * what stops the overlap reading as one smeared shape — it is drawn in the
 * card's own background, so a face is separated from the one it sits on by a
 * gap rather than by a line of some third colour.
 *
 * Order is the caller's. Overflow collapses into a "+n" disc at the end rather
 * than truncating silently: the faces are a sample, and the disc is what says
 * so. Every name is still announced, so nothing is lost when the disc appears.
 *
 * With `popover` set, the whole stack is one trigger for a list that captions
 * every face. One trigger rather than one per avatar: at this size the faces
 * are individually unhittable on a phone, and the question a reader has is
 * "who are all of these", not "who is the third one".
 */
export function AvatarStack({ items, max = 8, size = 'small', label, popover }: AvatarStackProps) {
  /*
   * Two reasons to be open, tracked apart: a mouse hovering, and a tap or
   * Enter having toggled it. Separate so that a mouse wandering off doesn't
   * close a popover a click deliberately opened — and so that a tap (which
   * hovers nothing on a touch screen) has a state of its own.
   */
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const open = hovered || pinned;

  const close = useCallback(() => {
    setPinned(false);
    setHovered(false);
  }, []);

  // The tap-outside route out, same as the shell menu's. Registered only while
  // pinned: a hover-opened popover already closes itself on mouse leave.
  useEffect(() => {
    if (!pinned) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setPinned(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [pinned]);

  if (items.length === 0) return null;

  /*
   * With exactly one over the limit, the "+1" disc costs the same room as the
   * face it replaces and says less — so the cut only happens once it buys
   * something.
   */
  const shown = items.length > max + 1 ? items.slice(0, max) : items;
  const hidden = items.length - shown.length;

  if (!popover) {
    return (
      <ul className={`${styles.stack} ${styles[size]}`} aria-label={label}>
        {shown.map((item) => (
          <li key={item.id} className={styles.item}>
            {/* `title` gives the pointer a way to read a face the layout has no
                room to caption; the hidden text is what carries it elsewhere. */}
            <span title={item.name}>
              <Avatar name={item.name} src={item.avatarUrl} size={size} />
            </span>
            <VisuallyHidden>{item.name}</VisuallyHidden>
          </li>
        ))}

        {hidden > 0 ? (
          <li className={`${styles.item} ${styles.overflow}`}>
            <span className={styles.overflowDisc} aria-hidden="true">
              +{hidden}
            </span>
            <VisuallyHidden>
              {items
                .slice(shown.length)
                .map((item) => item.name)
                .join(', ')}
            </VisuallyHidden>
          </li>
        ) : null}
      </ul>
    );
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      /* Gated to a real mouse: on a touch screen the emulated mouseenter and
         the click arrive together, and letting both act would open on the
         enter only to have the click toggle it shut again. */
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setHovered(false);
      }}
    >
      <button
        type="button"
        className={`${styles.stack} ${styles.trigger} ${styles[size]}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setPinned((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            close();
          }
        }}
      >
        {shown.map((item) => (
          <span key={item.id} className={styles.item}>
            <Avatar name={item.name} src={item.avatarUrl} size={size} />
          </span>
        ))}

        {hidden > 0 ? (
          <span className={`${styles.item} ${styles.overflow}`}>
            <span className={styles.overflowDisc} aria-hidden="true">
              +{hidden}
            </span>
          </span>
        ) : null}

        {/* The names live in the popover once there is one; the trigger only
            has to say what pressing it reveals. */}
        <VisuallyHidden>{label}</VisuallyHidden>
      </button>

      {open ? (
        <div id={panelId} className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>{label}</span>
            {/* The touch route out — a finger has no Escape and no hover to
                withdraw. */}
            <IconButton icon="close" label={popover.closeLabel} onClick={close} />
          </div>

          <ul className={styles.panelList}>
            {items.map((item) => (
              <li key={item.id} className={styles.panelRow}>
                <Avatar name={item.name} src={item.avatarUrl} size="small" />
                <span className={styles.panelName}>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
