import { describe, expect, it } from 'vitest';
import { canonicalRef, electionPath, shareIntroUrl, stepPath } from './paths';

const REF = { electionKey: 'komunalni-2022', district: 'pardubice' };
const EMBED_REF = { ...REF, embed: 'idnes' };

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

  it('drops the embed prefix — a shared link opens the full site', () => {
    expect(shareIntroUrl('https://kalkulacka.example.cz', EMBED_REF)).toBe(
      'https://kalkulacka.example.cz/volby/komunalni-2022/pardubice/uvod',
    );
  });
});

describe('embed threading', () => {
  it('keeps flow links under the embed prefix when the ref carries one', () => {
    expect(stepPath(EMBED_REF, 'review')).toBe(
      '/embed/idnes/volby/komunalni-2022/pardubice/rekapitulace',
    );
    expect(electionPath('komunalni-2022', 'idnes')).toBe('/embed/idnes/volby/komunalni-2022');
  });

  it('canonicalRef strips the embed and nothing else', () => {
    expect(canonicalRef(EMBED_REF)).toEqual(REF);
    expect(stepPath(canonicalRef(EMBED_REF), 'intro')).toBe('/volby/komunalni-2022/pardubice/uvod');
  });
});
