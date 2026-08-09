import { describe, expect, it } from 'vitest';
import { generateMetadata } from './page';

/*
 * Fixture mode — no `DATA_ENDPOINT`, same as `lib/calculators.test.ts`. Only
 * `generateMetadata` is exercised here; the page component itself renders
 * client components that need a browser environment this project's other
 * server-module tests don't set up.
 */

function metadataFor(path: string[]) {
  return generateMetadata({ params: Promise.resolve({ path }) });
}

describe('generateMetadata', () => {
  it('sets no title for home, so the layout default stands untemplated', async () => {
    const metadata = await metadataFor([]);
    expect(metadata.title).toBeUndefined();
    expect(metadata.description).toBe(
      'Porovnejte své názory s programy politických stran a zjistěte, které straně jste nejblíž.',
    );
  });

  it('titles the election picker with the election name', async () => {
    const metadata = await metadataFor(['volby', 'komunalni-2022']);
    expect(metadata.title).toBe('Komunální volby 2022');
  });

  it('returns nothing for an unknown election', async () => {
    const metadata = await metadataFor(['volby', 'no-such-election']);
    expect(metadata).toEqual({});
  });

  it('titles a calculator step with the calculator and election name', async () => {
    const metadata = await metadataFor(['volby', 'komunalni-2022', 'pardubice', 'uvod']);
    expect(metadata.title).toBe('Pardubice — Komunální volby 2022');
  });

  it('shares the same title across every flow step', async () => {
    const intro = await metadataFor(['volby', 'komunalni-2022', 'pardubice', 'uvod']);
    const question = await metadataFor(['volby', 'komunalni-2022', 'pardubice', 'otazka', '1']);
    const review = await metadataFor(['volby', 'komunalni-2022', 'pardubice', 'rekapitulace']);
    expect(question.title).toBe(intro.title);
    expect(review.title).toBe(intro.title);
  });

  it('returns nothing for an embed path', async () => {
    const metadata = await metadataFor(['embed', 'partner']);
    expect(metadata).toEqual({});
  });

  it('returns nothing for an unresolved public result id', async () => {
    // No database backend in the test environment, so any id is unresolved —
    // this pins the existing shared-result behaviour, unchanged by this task.
    const metadata = await metadataFor([
      'volby',
      'komunalni-2022',
      'pardubice',
      'vysledek',
      '00000000-0000-0000-0000-000000000000',
    ]);
    expect(metadata).toEqual({});
  });
});
