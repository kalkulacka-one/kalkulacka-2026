import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  PHYSICS,
  SPRING_BACK_DURATION,
  STACK_BACK,
  STACK_NEXT,
  STACK_TRAVEL,
  type SwipeZone,
  shouldCommit,
  stackTransform,
  transform,
  zoneForOffset,
} from './swipe-physics';

export type SwipeIntent = { zone: SwipeZone; important: boolean };

export type UseSwipeDeckOptions = {
  /**
   * Called when a drag travelled far enough to count as an answer.
   *
   * `fromTransform` is where the card was at release — the caller hands it to
   * the fly-out so the exit animation continues from the drag rather than
   * jumping back to centre first.
   */
  onCommit: (intent: SwipeIntent, fromTransform: string) => void;
  /** Zone under the finger right now, for the drag hint. `null` when unclear. */
  onIntentChange?: (intent: SwipeIntent | null) => void;
  disabled?: boolean;
};

/**
 * Pointer-driven card dragging, ported from the prototype.
 *
 * Transforms are written straight to the DOM rather than held in React state:
 * a drag produces a pointermove every frame, and re-rendering three stacked
 * cards at that rate is exactly the kind of jank this interaction cannot
 * afford. React still owns *what* is on each card — only the moment-to-moment
 * position is imperative.
 */
export function useSwipeDeck({ onCommit, onIntentChange, disabled = false }: UseSwipeDeckOptions) {
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const intentRef = useRef<SwipeIntent | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [intent, setIntent] = useState<SwipeIntent | null>(null);

  const publishIntent = useCallback(
    (next: SwipeIntent | null) => {
      const prev = intentRef.current;
      if (prev?.zone === next?.zone && prev?.important === next?.important) return;

      intentRef.current = next;
      setIntent(next);
      onIntentChange?.(next);
    },
    [onIntentChange],
  );

  /** Snap the stack back to its resting arrangement, without animating. */
  const resetStack = useCallback(() => {
    const card = cardRef.current;
    if (card) {
      card.style.transition = 'none';
      card.style.transform = transform(0, 0, 0);
      card.style.opacity = '1';
    }

    const next = nextRef.current;
    if (next) {
      next.style.transition = 'none';
      next.style.transform = stackTransform(STACK_NEXT.x, STACK_NEXT.y, STACK_NEXT.scale);
      next.style.opacity = String(STACK_NEXT.opacity);
    }

    const back = backRef.current;
    if (back) {
      back.style.transition = 'none';
      back.style.transform = stackTransform(STACK_BACK.x, STACK_BACK.y, STACK_BACK.scale);
      back.style.opacity = String(STACK_BACK.opacity);
    }
  }, []);

  const springBack = useCallback(() => {
    const easing = `transform ${SPRING_BACK_DURATION}s var(--vk-easing-spring), opacity ${SPRING_BACK_DURATION}s ease`;

    const card = cardRef.current;
    if (card) {
      card.style.transition = easing;
      card.style.transform = transform(0, 0, 0);
    }

    const next = nextRef.current;
    if (next) {
      next.style.transition = easing;
      next.style.transform = stackTransform(STACK_NEXT.x, STACK_NEXT.y, STACK_NEXT.scale);
      next.style.opacity = String(STACK_NEXT.opacity);
    }

    const back = backRef.current;
    if (back) {
      back.style.transition = easing;
      back.style.transform = stackTransform(STACK_BACK.x, STACK_BACK.y, STACK_BACK.scale);
      back.style.opacity = String(STACK_BACK.opacity);
    }
  }, []);

  // Listeners live on the window rather than the card so a fast drag that
  // outruns the pointer still tracks, and are attached only while dragging.
  useEffect(() => {
    if (!isDragging) return undefined;

    const handleMove = (event: globalThis.PointerEvent) => {
      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;
      offset.current = { x: dx, y: dy };

      const card = cardRef.current;
      if (card) card.style.transform = transform(dx, dy, dx / PHYSICS.rotationDivisor);

      // The stack rises toward the front as the top card leaves.
      const progress = Math.min(
        1,
        Math.max(Math.abs(dx), Math.abs(dy)) / PHYSICS.stackProgressDistance,
      );

      const next = nextRef.current;
      if (next) {
        next.style.transform = stackTransform(
          STACK_NEXT.x + STACK_TRAVEL.next.x * progress,
          STACK_NEXT.y + STACK_TRAVEL.next.y * progress,
          STACK_NEXT.scale + STACK_TRAVEL.next.scale * progress,
        );
        next.style.opacity = String(STACK_NEXT.opacity + STACK_TRAVEL.next.opacity * progress);
      }

      const back = backRef.current;
      if (back) {
        back.style.transform = stackTransform(
          STACK_BACK.x + STACK_TRAVEL.back.x * progress,
          STACK_BACK.y + STACK_TRAVEL.back.y * progress,
          STACK_BACK.scale + STACK_TRAVEL.back.scale * progress,
        );
        back.style.opacity = String(STACK_BACK.opacity + STACK_TRAVEL.back.opacity * progress);
      }

      publishIntent(zoneForOffset(dx, dy));
    };

    const handleUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setIsDragging(false);

      const { x: dx, y: dy } = offset.current;
      const settled = intentRef.current;

      if (settled && shouldCommit(settled.zone, dx, dy)) {
        const from = cardRef.current?.style.transform || transform(0, 0, 0);
        publishIntent(null);

        // An upward flick arms "important" even if the pointer drifted back
        // below the threshold before release.
        onCommit(
          {
            zone: settled.zone,
            important: settled.important || dy < PHYSICS.importantLiftY,
          },
          from,
        );

        // The card the user was holding has been cloned into the fly-out layer;
        // the real one goes straight back to centre showing the next question.
        resetStack();
        return;
      }

      publishIntent(null);
      springBack();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isDragging, onCommit, publishIntent, springBack, resetStack]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;

      dragging.current = true;
      start.current = { x: event.clientX, y: event.clientY };
      offset.current = { x: 0, y: 0 };

      // Kill transitions so the card tracks the pointer exactly.
      for (const ref of [cardRef, nextRef, backRef]) {
        if (ref.current) ref.current.style.transition = 'none';
      }

      setIsDragging(true);
    },
    [disabled],
  );

  return {
    cardRef,
    nextRef,
    backRef,
    onPointerDown,
    /** True only while the pointer is down and moving the card. */
    isDragging,
    /** What the current drag would do if released now. */
    intent,
    resetStack,
    springBack,
  };
}
