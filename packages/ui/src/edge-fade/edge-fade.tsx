import styles from './edge-fade.module.css';

export type EdgeFadeProps = {
  /** Which edge of the positioned parent the band covers. */
  edge: 'top' | 'bottom';
  /**
   * `edge` is a slim reading fade at a list's border; `action` is the taller
   * band a floating control sits in (`--vk-fade-action`), sized so the fade
   * and the control's clearance stay one number.
   */
  size?: 'edge' | 'action';
  /** Fades in and out with this; omit it for a band that is always on. */
  visible?: boolean;
};

/**
 * The one sanctioned "there is more content this way" treatment: a plain ramp
 * of the page colour over the edge of a scroll area, no blur.
 *
 * Purely decorative overlay — it must sit inside a `position: relative` box
 * that the scroller fills, above the scroller in paint order and transparent
 * to pointers. Every screen with a fading list uses this instead of rolling
 * its own gradient so the fades cannot drift apart again.
 */
export function EdgeFade({ edge, size = 'edge', visible }: EdgeFadeProps) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.fade} ${styles[edge]} ${styles[size]}`}
      data-visible={visible === false ? undefined : ''}
    />
  );
}
