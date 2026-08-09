import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icon/icon';
import styles from './drag-guides.module.css';

/**
 * Where a card can be dragged, named as compass points.
 *
 * The diagonals are an answer *plus* "pro mě důležité" — the same swipe, lifted.
 * There is no north on its own: an upward drag that goes nowhere sideways
 * commits nothing.
 */
export type DragDirection = 'nw' | 'w' | 'ne' | 'e' | 's';

export const DRAG_DIRECTIONS: readonly DragDirection[] = ['nw', 'w', 'ne', 'e', 's'] as const;

export type DragGuidesLabels = {
  agree: string;
  disagree: string;
  important: string;
  skip: string;
};

export type DragGuidesProps = {
  labels: DragGuidesLabels;
  /**
   * The desktop reading: diagonals split into two straight icons (an upward
   * arrow, then the answer's own arrow) instead of one arrow on the
   * diagonal, and every pill spells its direction out in words.
   *
   * Both are a room budget, not a taste: this card lives in a fixed-width
   * reading column, so "wide enough" never arrives from a bigger window the
   * way it does for the card's own answer-button labels — it has to come
   * from somewhere else, and the same signal that already tells the tutorial
   * apart by pointer is the one this reuses. On a touch-sized card the
   * pills stay icon-only; five of them carrying a word each is more text
   * than the statement above has room to share the card with.
   */
  split?: boolean;
  /** Directions already tried, which fade back to leave the untried ones lit. */
  practised?: ReadonlySet<DragDirection>;
  /** Where the drag under the pointer right now would commit. */
  active?: DragDirection | null;
};

type GuideIcon = { icon: IconName; rotation?: number };

/** What to draw and what to say, for one direction. */
function guideFor(
  direction: DragDirection,
  split: boolean,
  labels: DragGuidesLabels,
): { icons: GuideIcon[]; label: string } {
  switch (direction) {
    case 'w':
      return { icons: [{ icon: 'arrowLeft' }], label: labels.agree };
    case 'e':
      return { icons: [{ icon: 'arrowRight' }], label: labels.disagree };
    case 's':
      return { icons: [{ icon: 'arrowDown' }], label: labels.skip };
    case 'nw':
      return {
        icons: split
          ? [{ icon: 'arrowUp' }, { icon: 'arrowLeft' }]
          : [{ icon: 'arrowLeft', rotation: 45 }, { icon: 'starThin' }],
        label: labels.important,
      };
    case 'ne':
      return {
        icons: split
          ? [{ icon: 'arrowUp' }, { icon: 'arrowRight' }]
          : [{ icon: 'arrowLeft', rotation: 135 }, { icon: 'starThin' }],
        label: labels.important,
      };
  }
}

/**
 * The compass drawn inside the practice card.
 *
 * A first-time reader's difficulty is not that dragging is hard, it is that
 * nothing about a card says it can be dragged at all. So the directions are
 * drawn where they are: labelled pills hugging the card's edges — the same
 * bordered-pill language as "Přeskočit" below the card, not a bare icon that
 * reads as decoration — lighting up as the drag reaches them.
 *
 * Colour is neutral rather than tied to the answer (no green/red): five
 * tinted marks in a 300px card competed with each other and with the card's
 * own agree/disagree buttons for the reader's eye. What *is* dragged toward
 * lights up with a filled neutral pill instead, the same treatment `FlowNav`
 * gives an explicitly skipped question.
 *
 * Decorative: `aria-hidden`, no pointer events. Every direction is also a
 * button on the card and a sentence in the help overlay, so nothing is lost by
 * not putting these in the tab order.
 */
export function DragGuides({ labels, split = false, practised, active = null }: DragGuidesProps) {
  return (
    <div className={styles.guides} aria-hidden="true">
      {DRAG_DIRECTIONS.map((direction) => {
        const { icons, label } = guideFor(direction, split, labels);

        return (
          <span
            key={direction}
            className={[
              styles.guide,
              styles[direction],
              practised?.has(direction) ? styles.done : undefined,
              active === direction ? styles.active : undefined,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.icons}>
              {icons.map(({ icon, rotation }, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed, order-stable pair per direction — nothing here is ever reordered or filtered.
                <IconGlyph key={index} icon={icon} rotation={rotation} />
              ))}
            </span>
            {split ? <span className={styles.label}>{label}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function IconGlyph({ icon, rotation }: GuideIcon): ReactNode {
  const glyph = <Icon name={icon} size={14} />;
  return rotation ? <span style={{ rotate: `${rotation}deg` }}>{glyph}</span> : glyph;
}
