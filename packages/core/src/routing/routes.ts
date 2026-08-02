/**
 * The URL grammar, as pure functions.
 *
 * The app renders every screen from a single catch-all route and asks this
 * module what the path means. That replaces the previous platform's matrix of
 * ~50 near-identical route files, and it makes the URL scheme unit-testable
 * without booting a framework.
 */

export type FlowStep = 'intro' | 'guide' | 'question' | 'review' | 'result' | 'comparison';

/** Localised path segments. One of these per locale. */
export type RouteSlugs = {
  /** Prefix before the election key, e.g. "volby". */
  elections: string;
  steps: Record<FlowStep, string>;
  /** Prefix for embedded views. */
  embed: string;
};

export const CS_SLUGS: RouteSlugs = {
  elections: 'volby',
  embed: 'embed',
  steps: {
    intro: 'uvod',
    guide: 'navod',
    question: 'otazka',
    review: 'rekapitulace',
    result: 'vysledek',
    comparison: 'porovnani',
  },
};

export type CalculatorRoute = {
  /** Embed partner name, when rendered inside a third-party page. */
  embed?: string;
  /** e.g. "komunalni-2022" */
  electionKey: string;
  /** Municipality slug or senate district number. Absent = district picker. */
  district?: string;
  step: FlowStep;
  /** Question number (1-based, as a string) or a public result id. */
  param?: string;
};

/** The district picker for an election — no district chosen yet. */
export type ElectionRoute = {
  embed?: string;
  electionKey: string;
};

export type ParsedRoute =
  | { kind: 'home'; embed?: string }
  | ({ kind: 'election' } & ElectionRoute)
  | ({ kind: 'calculator' } & CalculatorRoute);

function stepFromSlug(slug: string, slugs: RouteSlugs): FlowStep | undefined {
  const entry = Object.entries(slugs.steps).find(([, value]) => value === slug);
  return entry?.[0] as FlowStep | undefined;
}

/**
 * Turn a path into meaning.
 *
 * Returns `null` for anything unrecognised so the caller can render a 404
 * rather than guessing.
 */
export function parseRoute(segments: string[], slugs: RouteSlugs = CS_SLUGS): ParsedRoute | null {
  let rest = [...segments].filter(Boolean);
  let embed: string | undefined;

  // Embeds are a prefix on the same grammar, not a parallel route tree.
  if (rest[0] === slugs.embed) {
    embed = rest[1];
    if (!embed) return null;
    rest = rest.slice(2);
  }

  if (rest.length === 0) return embed ? { kind: 'home', embed } : { kind: 'home' };

  if (rest[0] !== slugs.elections) return null;
  rest = rest.slice(1);

  const electionKey = rest[0];
  if (!electionKey) return null;
  rest = rest.slice(1);

  if (rest.length === 0) return { kind: 'election', electionKey, embed };

  const district = rest[0];
  if (!district) return null;
  rest = rest.slice(1);

  // A calculator with no step lands on the intro.
  if (rest.length === 0) {
    return { kind: 'calculator', electionKey, district, step: 'intro', embed };
  }

  const step = stepFromSlug(rest[0] as string, slugs);
  if (!step) return null;

  const param = rest[1];

  return { kind: 'calculator', electionKey, district, step, param, embed };
}

/** Build a path. The inverse of `parseRoute`. */
export function buildRoute(route: ParsedRoute, slugs: RouteSlugs = CS_SLUGS): string {
  const segments: string[] = [];

  if (route.embed) segments.push(slugs.embed, route.embed);

  if (route.kind === 'home') return `/${segments.join('/')}`.replace(/\/$/, '') || '/';

  segments.push(slugs.elections, route.electionKey);

  if (route.kind === 'election') return `/${segments.join('/')}`;

  segments.push(route.district ?? '');
  segments.push(slugs.steps[route.step]);
  if (route.param) segments.push(route.param);

  return `/${segments.filter(Boolean).join('/')}`;
}

/** Convenience for the most common link: question N of a calculator. */
export function questionPath(
  route: Omit<CalculatorRoute, 'step' | 'param'>,
  questionNumber: number,
  slugs: RouteSlugs = CS_SLUGS,
): string {
  return buildRoute(
    { kind: 'calculator', ...route, step: 'question', param: String(questionNumber) },
    slugs,
  );
}
