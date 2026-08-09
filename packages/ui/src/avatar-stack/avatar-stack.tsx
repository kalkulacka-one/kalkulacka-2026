import { Avatar } from '../avatar/avatar';
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
 */
export function AvatarStack({ items, max = 8, size = 'small', label }: AvatarStackProps) {
  if (items.length === 0) return null;

  /*
   * With exactly one over the limit, the "+1" disc costs the same room as the
   * face it replaces and says less — so the cut only happens once it buys
   * something.
   */
  const shown = items.length > max + 1 ? items.slice(0, max) : items;
  const hidden = items.length - shown.length;

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
