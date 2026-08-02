/**
 * Gesture constants, measured from the prototype.
 *
 * These are the feel of the product, so they live together and named rather
 * than scattered as literals. They are not theme tokens: a partner re-skinning
 * the app should not be able to accidentally change how a swipe behaves.
 */

export type SwipeZone = 'agree' | 'disagree' | 'skip';

/** Where the stacked cards sit when the top card is at rest. */
export const STACK_NEXT = {
  x: 16,
  y: -18,
  scale: 0.95,
  rotate: 0.8,
  brightness: 0.92,
  opacity: 1,
} as const;

export const STACK_BACK = {
  x: 32,
  y: -34,
  scale: 0.89,
  rotate: 1.5,
  brightness: 0.82,
  opacity: 1,
} as const;

/** How far the stack cards travel toward the front as the top card is dragged. */
export const STACK_TRAVEL = {
  next: { x: -16, y: 18, scale: 0.05, rotate: -0.8, brightness: 0.08, opacity: 0 },
  back: { x: -16, y: 16, scale: 0.06, rotate: -0.7, brightness: 0.1, opacity: 0 },
} as const;

export const PHYSICS = {
  /** Drag distance that commits an answer. */
  threshold: 50,
  /** Horizontal drag is divided by this to produce the card's tilt in degrees. */
  rotationDivisor: 18,
  /** Drag distance at which the stack has fully caught up. */
  stackProgressDistance: 130,
  /** Horizontal travel before a left/right intent is recognised. */
  zoneActivateX: 25,
  /** Upward travel that arms "pro mě důležité" mid-swipe. */
  importantLiftY: -38,
  /** Downward travel before a skip is recognised... */
  skipActivateY: 45,
  /** ...and how much it must dominate horizontal travel to count as one. */
  skipDominance: 1.2,
} as const;

/** Where a committed card flies to. */
export const EXIT = {
  horizontalX: 480,
  /** An important answer flicks up and away; an ordinary one drops slightly. */
  liftImportant: -300,
  liftNormal: 60,
  rotation: 24,
  skipY: 560,
  skipRotation: 2,
  /** Advancing without recording an answer — a small lift, no fling. */
  advanceY: -34,
  advanceScale: 0.94,
} as const;

export type CommitSpeed = 'normal' | 'slow' | 'instant';

/**
 * Committing by tap animates slower than committing by flick: the card has no
 * momentum to inherit, so matching the drag timing reads as abrupt.
 */
export const SPEEDS: Record<CommitSpeed, { fly: number; fade: number }> = {
  normal: { fly: 0.38, fade: 0.16 },
  slow: { fly: 0.44, fade: 0.2 },
  instant: { fly: 0.12, fade: 0.1 },
};

export const SPRING_BACK_DURATION = 0.36;

export function transform(x: number, y: number, rotation: number) {
  return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
}

export function stackTransform(x: number, y: number, scale: number, rotate = 0) {
  return `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`;
}

/**
 * Read a drag offset as intent.
 *
 * Order matters: a downward drag is tested first and must clearly dominate, so
 * that a sloppy diagonal still registers as the left/right answer the user
 * meant rather than silently skipping the question.
 */
export function zoneForOffset(
  dx: number,
  dy: number,
): { zone: SwipeZone; important: boolean } | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (dy > PHYSICS.skipActivateY && absY > absX * PHYSICS.skipDominance) {
    return { zone: 'skip', important: false };
  }

  if (absX > PHYSICS.zoneActivateX) {
    // Left is "Souhlasím" — it matches the button order on the card.
    return {
      zone: dx < 0 ? 'agree' : 'disagree',
      important: dy < PHYSICS.importantLiftY,
    };
  }

  return null;
}

/** Whether a released drag travelled far enough to commit. */
export function shouldCommit(zone: SwipeZone, dx: number, dy: number): boolean {
  if (zone === 'skip') return dy > PHYSICS.threshold;
  return Math.abs(dx) > PHYSICS.threshold;
}

export function exitTransform(zone: SwipeZone, important: boolean): string {
  if (zone === 'skip') {
    return transform(0, EXIT.skipY, EXIT.skipRotation);
  }

  const sign = zone === 'agree' ? -1 : 1;
  const lift = important ? EXIT.liftImportant : EXIT.liftNormal;

  return transform(sign * EXIT.horizontalX, lift, sign * EXIT.rotation);
}

/** Advancing to an already-answered card: no fling, just a lift and fade. */
export function advanceTransform(): string {
  return `translate(0px, ${EXIT.advanceY}px) scale(${EXIT.advanceScale})`;
}
