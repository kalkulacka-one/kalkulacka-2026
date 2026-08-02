import { describe, expect, it } from 'vitest';
import { buildRoute, type ParsedRoute, parseRoute, questionPath } from './routes';

const segs = (path: string) => path.split('/').filter(Boolean);

describe('parseRoute', () => {
  it('reads the homepage', () => {
    expect(parseRoute([])).toEqual({ kind: 'home' });
  });

  it('reads an election as the district picker', () => {
    expect(parseRoute(segs('/volby/komunalni-2022'))).toEqual({
      kind: 'election',
      electionKey: 'komunalni-2022',
      embed: undefined,
    });
  });

  it('defaults a bare calculator to the intro', () => {
    expect(parseRoute(segs('/volby/komunalni-2022/pardubice'))).toMatchObject({
      kind: 'calculator',
      electionKey: 'komunalni-2022',
      district: 'pardubice',
      step: 'intro',
    });
  });

  it('reads each localised step slug', () => {
    const cases: Record<string, string> = {
      navod: 'guide',
      rekapitulace: 'review',
      vysledek: 'result',
      porovnani: 'comparison',
    };

    for (const [slug, step] of Object.entries(cases)) {
      expect(parseRoute(segs(`/volby/komunalni-2022/pardubice/${slug}`))).toMatchObject({ step });
    }
  });

  it('reads a question number', () => {
    expect(parseRoute(segs('/volby/komunalni-2022/pardubice/otazka/3'))).toMatchObject({
      step: 'question',
      param: '3',
    });
  });

  it('treats embed as a prefix on the same grammar', () => {
    expect(parseRoute(segs('/embed/alarm/volby/komunalni-2022/pardubice/otazka/3'))).toMatchObject({
      kind: 'calculator',
      embed: 'alarm',
      electionKey: 'komunalni-2022',
      district: 'pardubice',
      step: 'question',
      param: '3',
    });
  });

  it('returns null for paths it does not recognise', () => {
    expect(parseRoute(segs('/nonsense'))).toBeNull();
    expect(parseRoute(segs('/volby/komunalni-2022/pardubice/neznamy-krok'))).toBeNull();
    expect(parseRoute(segs('/embed'))).toBeNull();
  });
});

describe('buildRoute', () => {
  it('round-trips every route it can parse', () => {
    const paths = [
      '/volby/komunalni-2022',
      '/volby/komunalni-2022/pardubice/uvod',
      '/volby/komunalni-2022/pardubice/navod',
      '/volby/komunalni-2022/pardubice/otazka/7',
      '/volby/komunalni-2022/pardubice/rekapitulace',
      '/volby/komunalni-2022/pardubice/vysledek',
      '/embed/alarm/volby/senatni-2022/1/otazka/12',
    ];

    for (const path of paths) {
      const parsed = parseRoute(segs(path)) as ParsedRoute;
      expect(parsed, path).not.toBeNull();
      expect(buildRoute(parsed), path).toBe(path);
    }
  });

  it('builds the homepage', () => {
    expect(buildRoute({ kind: 'home' })).toBe('/');
    expect(buildRoute({ kind: 'home', embed: 'alarm' })).toBe('/embed/alarm');
  });
});

describe('questionPath', () => {
  it('links to a numbered question', () => {
    expect(questionPath({ electionKey: 'komunalni-2022', district: 'pardubice' }, 5)).toBe(
      '/volby/komunalni-2022/pardubice/otazka/5',
    );
  });
});
