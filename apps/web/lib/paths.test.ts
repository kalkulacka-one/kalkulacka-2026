import { describe, expect, it } from 'vitest';
import { shareIntroUrl } from './paths';

const REF = { electionKey: 'komunalni-2022', district: 'pardubice' };

describe('shareIntroUrl', () => {
  it('points at the intro, not whatever page the sender is on', () => {
    expect(shareIntroUrl('https://kalkulacka.example.cz', REF)).toBe(
      'https://kalkulacka.example.cz/volby/komunalni-2022/pardubice/uvod',
    );
  });

  it('is absolute off whichever origin the reader is actually on', () => {
    // Staging, a preview deployment, an embed's host — same shape as
    // `onCopyLink` in `share-dialog.tsx`, which reads `window.location.origin`
    // for the same reason rather than a build-time base URL.
    expect(shareIntroUrl('http://localhost:3016', REF)).toBe(
      'http://localhost:3016/volby/komunalni-2022/pardubice/uvod',
    );
  });
});
