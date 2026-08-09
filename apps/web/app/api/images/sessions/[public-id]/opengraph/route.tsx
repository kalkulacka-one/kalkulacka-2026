import { buildResults } from '@vk/core';
import { getMessages, percent } from '@vk/i18n';
import { LOGO_PATHS, LOGO_VIEWBOX } from '@vk/ui/logo-paths';
import { ImageResponse } from 'next/og';
import { NotFoundError } from '@/lib/api/http-errors';
import { SessionsDisabledError, sessionsEnabled } from '@/lib/api/sessions-enabled';
import { loadCalculator } from '@/lib/calculators';
import { loadSharedResult } from '@/lib/shared-result';

/**
 * The picture a shared link unfurls into.
 *
 * Same address the previous app served it from, so links minted by either
 * resolve. It is generated rather than stored: the ranking already exists in
 * the session, and an image file per shared result would be a second copy of
 * it to keep, serve, and eventually delete.
 *
 * Rendered by satori, which is not a browser — no CSS modules, no custom
 * properties, no `light-dark()`, every element that has more than one child
 * must say `display: flex`, and the fonts have to be handed over as bytes.
 * That is why this file redraws the ranking in inline styles instead of
 * reusing `ShareCard`, which is built out of the app's real components.
 */

export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * The default theme's light palette, resolved.
 *
 * Hard-coded on purpose: the tokens are authored as `light-dark()` custom
 * properties and there is no DOM here to resolve them against — the same
 * reason `share-card/theme-colors.ts` keeps a hand-copied fallback set. Worth
 * re-checking against `packages/tokens/src/themes/default.theme.ts` if that
 * palette ever moves; drift shows up as an off-brand card, not as a failure.
 */
const COLOR = {
  page: '#f8fafc',
  surface: '#ffffff',
  surfaceSunken: '#f1f5f9',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  agree: '#2563eb',
} as const;

/** How many rows the card carries. Three read at a glance in a feed; five do not. */
const TOP_N = 3;

type FontSpec = { family: string; weight: 400 | 600 | 700 };

const FONTS: readonly FontSpec[] = [
  { family: 'Geist', weight: 400 },
  { family: 'Geist', weight: 600 },
  { family: 'Radio Canada', weight: 700 },
];

/** Fetched once per server process — a font file at a given URL never changes. */
const fontCache = new Map<string, ArrayBuffer>();

/**
 * One weight of one Google font, as bytes satori can read.
 *
 * The app itself loads these through `next/font/google`, which hands the
 * bundler a file rather than anything a route handler can reach, so this goes
 * to the source. The archaic user agent is load-bearing twice over: Google
 * serves woff2 (which satori cannot parse) to anything modern, and it splits
 * modern responses into per-`unicode-range` faces — the legacy response is one
 * TrueType face covering the whole charset, which is what keeps ř, ě and ů
 * from rendering as tofu.
 */
async function loadFont({ family, weight }: FontSpec): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}`;
  const cached = fontCache.get(key);
  if (cached) return cached;

  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
    const css = await fetch(cssUrl, {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64)' },
    }).then((response) => response.text());

    const source = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('(?:truetype|opentype)'\)/);
    if (!source?.[1]) return null;

    const data = await fetch(source[1]).then((response) => response.arrayBuffer());
    fontCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Every font, or as many as answered.
 *
 * A font server that is slow or unreachable must not turn a shared link into a
 * broken preview: an empty list makes `ImageResponse` fall back to its own
 * bundled face, which draws the card in the wrong typeface rather than not at
 * all. Partial results are dropped for the same reason a half-loaded family
 * would look worse than a consistent substitute.
 */
async function loadFonts() {
  const loaded = await Promise.all(
    FONTS.map(async (spec) => {
      const data = await loadFont(spec);
      return data
        ? { name: spec.family, data, weight: spec.weight, style: 'normal' as const }
        : null;
    }),
  );

  return loaded.every((font) => font !== null) ? loaded : [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ 'public-id': string }> },
) {
  if (!sessionsEnabled()) {
    return new SessionsDisabledError().toResponse();
  }

  const { 'public-id': publicId } = await params;

  // No calculator id to cross-check against here — the URL names a session and
  // nothing else, so the session's own calculator is the answer by definition.
  const shared = await loadSharedResult(publicId);
  if (!shared) {
    return new NotFoundError('Session not found').toResponse();
  }

  const calculator = await loadCalculator(shared.calculatorGroup ?? '', shared.calculatorKey);
  if (!calculator) {
    return new NotFoundError('Calculator not found').toResponse();
  }

  /*
   * Recomputed from the answers rather than read from the session's stored
   * ranking: the page the link opens does exactly the same, and a card that
   * disagreed with the page it advertises is worse than no card.
   */
  const results = buildResults(calculator, shared.answers)
    // A candidate who answered nothing has no percentage and so no bar. They
    // belong in the full ranking, where the row can say why; they do not
    // belong in a three-row picture that is entirely about proportions.
    .filter((result) => result.match.matchPercentage !== undefined)
    .slice(0, TOP_N);

  if (results.length === 0) {
    return new NotFoundError('Nothing to render').toResponse();
  }

  const messages = getMessages();
  const copy = messages.results.shared;
  const host = process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL).host
    : undefined;

  const fonts = await loadFonts();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: COLOR.page,
        padding: '56px 64px',
        fontFamily: 'Geist',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 440,
          paddingRight: 48,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/*
            The election and the calculator, as two chips — the app's header
            sets the same two strings side by side, and keeping them apart here
            (rather than joining them with a separator) is what lets the
            calculator's name wrap on its own when it is a long one.
          */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
            {[calculator.electionName, calculator.name].filter(Boolean).map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  borderRadius: 9,
                  backgroundColor: COLOR.surfaceSunken,
                  color: COLOR.textMuted,
                  fontSize: 22,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              fontFamily: 'Radio Canada',
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.1,
              color: COLOR.text,
            }}
          >
            {copy.ogTitle}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 26, color: COLOR.textMuted }}>
            {host ? `${copy.ogCta} — ${host}` : copy.ogCta}
          </div>

          {/* The real mark, drawn from the same paths the app's `<Logo>` uses. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg
              width={Math.round((40 * LOGO_VIEWBOX.width) / LOGO_VIEWBOX.height)}
              height={40}
              viewBox={`${LOGO_VIEWBOX.x} ${LOGO_VIEWBOX.y} ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={messages.app.title}
            >
              {LOGO_PATHS.map((d) => (
                <path key={d} d={d} fill={COLOR.text} />
              ))}
            </svg>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, color: COLOR.text }}>
              {messages.app.title}
            </div>
          </div>
        </div>
      </div>

      {/*
        The ranking, drawn the way `MatchRow` draws it: the signature card with
        the square top-left corner, the match as a bar along its *top edge*
        against a full-width track, and the percentage as the row's right-hand
        number. Only the winner's bar is coloured — in a feed the order is the
        message, and three accent colours compete with it.
      */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          gap: 24,
        }}
      >
        {results.map(({ candidate, match, rank }, index) => (
          <div
            key={candidate.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: COLOR.surface,
              border: `1px solid ${COLOR.border}`,
              borderRadius: '0 24px 24px 24px',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', height: 10, backgroundColor: COLOR.border }}>
              <div
                style={{
                  display: 'flex',
                  width: `${match.matchPercentage ?? 0}%`,
                  backgroundColor: index === 0 ? COLOR.agree : COLOR.textMuted,
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '22px 28px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 28,
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLOR.textMuted,
                }}
              >
                {rank ?? index + 1}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                {index === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignSelf: 'flex-start',
                      marginBottom: 6,
                      padding: '4px 12px',
                      borderRadius: 100,
                      backgroundColor: COLOR.surfaceSunken,
                      color: COLOR.textMuted,
                      fontSize: 18,
                    }}
                  >
                    {messages.results.winner}
                  </div>
                ) : null}

                {/* The short name, for the same reason the share card uses it:
                    "SPOLU" fits where the full coalition title would not. */}
                <div
                  style={{
                    display: 'flex',
                    fontSize: index === 0 ? 36 : 32,
                    fontWeight: 600,
                    color: COLOR.text,
                  }}
                >
                  {candidate.shortName || candidate.name}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: index === 0 ? 40 : 34,
                  fontWeight: 600,
                  color: COLOR.text,
                }}
              >
                {percent(match.matchPercentage ?? 0)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>,
    { width: WIDTH, height: HEIGHT, ...(fonts.length > 0 ? { fonts } : {}) },
  );
}
