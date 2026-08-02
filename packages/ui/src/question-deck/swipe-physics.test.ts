import { describe, expect, it } from 'vitest';
import { PHYSICS, shouldCommit, zoneForOffset } from './swipe-physics';

describe('zoneForOffset', () => {
  it('reads a left drag as agree and a right drag as disagree', () => {
    expect(zoneForOffset(-50, 0)).toEqual({ zone: 'agree', important: false });
    expect(zoneForOffset(50, 0)).toEqual({ zone: 'disagree', important: false });
  });

  it('ignores travel too small to be intentional', () => {
    expect(zoneForOffset(PHYSICS.zoneActivateX, 0)).toBeNull();
    expect(zoneForOffset(-PHYSICS.zoneActivateX, 0)).toBeNull();
    expect(zoneForOffset(0, 0)).toBeNull();
  });

  it('arms "important" when the drag also lifts', () => {
    expect(zoneForOffset(-60, -60)).toEqual({ zone: 'agree', important: true });
    expect(zoneForOffset(60, -60)).toEqual({ zone: 'disagree', important: true });
  });

  it('reads a downward drag as skip', () => {
    expect(zoneForOffset(0, 80)).toEqual({ zone: 'skip', important: false });
  });

  it('prefers the horizontal answer on a sloppy diagonal', () => {
    // Travelling down and right in roughly equal measure: the user was aiming
    // sideways, so this must not silently skip the question.
    expect(zoneForOffset(80, 80)).toEqual({ zone: 'disagree', important: false });
  });

  it('only skips when the downward drag clearly dominates', () => {
    const dy = 100;
    const dominant = dy / PHYSICS.skipDominance;

    expect(zoneForOffset(dominant - 10, dy)?.zone).toBe('skip');
    expect(zoneForOffset(dominant + 10, dy)?.zone).toBe('disagree');
  });
});

describe('shouldCommit', () => {
  it('needs the threshold to be exceeded horizontally', () => {
    expect(shouldCommit('agree', -PHYSICS.threshold, 0)).toBe(false);
    expect(shouldCommit('agree', -PHYSICS.threshold - 1, 0)).toBe(true);
    expect(shouldCommit('disagree', PHYSICS.threshold + 1, 0)).toBe(true);
  });

  it('measures a skip against downward travel only', () => {
    expect(shouldCommit('skip', 0, PHYSICS.threshold + 1)).toBe(true);
    expect(shouldCommit('skip', 500, PHYSICS.threshold - 1)).toBe(false);
  });
});
