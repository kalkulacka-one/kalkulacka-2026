import {
  type Calculator,
  type CalculatorRoute,
  countAnswered,
  type ParsedRoute,
  parseRoute,
} from '@vk/core';
import { format, getMessages, routeSlugs } from '@vk/i18n';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '../../components/app-shell';
import { CalculatorIntro } from '../../components/calculator-intro';
import { CalculatorSession } from '../../components/calculator-session';
import { DistrictPicker, type PickerDistrict } from '../../components/district-picker';
import { Guide } from '../../components/guide';
import { QuestionFlow } from '../../components/question-flow';
import { Recap } from '../../components/recap';
import { Results } from '../../components/results';
import {
  listAvailableCalculators,
  listDistricts,
  loadCalculator,
  loadElection,
} from '../../lib/calculators';
import { type CalculatorRef, shellInfoOf, stepPath } from '../../lib/paths';
import { loadSharedResult } from '../../lib/shared-result';
import styles from './page.module.css';

/**
 * Every screen is rendered from this one route.
 *
 * `@vk/core`'s route parser turns the path into meaning, which is what lets a
 * single file replace the previous platform's matrix of ~50 near-identical
 * page and layout files. Embeds are a prefix on the same grammar rather than a
 * duplicated tree.
 */
export default async function CatchAllPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const route = parseRoute(path ?? [], routeSlugs());
  const messages = getMessages();

  if (!route) notFound();

  // Embed mode is parsed by @vk/core but not yet rendered — Phase 7 builds it.
  // Until then, an embed URL 404s rather than silently serving the full app
  // shell to a partner expecting a stripped-down embed.
  if (route.embed) notFound();

  if (route.kind === 'election') {
    const election = await loadElection(route.electionKey);
    if (!election) notFound();

    const districts: PickerDistrict[] = (await listDistricts(route.electionKey)).map(
      (district) => ({
        code: district.code,
        name: district.name,
        slug: district.slug,
        showCode: district.showCode,
        available: district.available,
        href: stepPath({ electionKey: route.electionKey, district: district.slug }, 'intro'),
      }),
    );

    return (
      <DistrictPicker
        electionName={election.name}
        districtKind={election.districtKind}
        districts={districts}
      />
    );
  }

  if (route.kind === 'calculator') {
    const calculator = await loadCalculator(route.electionKey, route.district ?? '');
    if (!calculator) notFound();

    const ref = { electionKey: route.electionKey, district: route.district ?? '' };

    /*
     * A public link to somebody's finished result — the one calculator URL
     * that is not the reader's own calculator. It is deliberately outside the
     * fragment below: `<CalculatorSession>` would open an anonymous session
     * for a visitor who has answered nothing, and the results screen's own
     * save hook would then overwrite it with a ranking read off the page.
     * Visiting this address must leave the viewer's own state exactly as it
     * was, so nothing that writes any of it is mounted at all.
     */
    if (route.step === 'result' && route.param) {
      const shared = await loadSharedResult(route.param, calculator.id);
      // Unknown id, malformed id, no backend, or a session belonging to a
      // different calculator than the URL names — all of them mean this
      // address does not identify a result.
      if (!shared) notFound();
      // A session with no answers is not a result: it would render an empty
      // ranking under a headline claiming somebody's shoda.
      if (countAnswered(calculator.questions, shared.answers) === 0) notFound();

      return <Results {...ref} calculator={calculator} shared={{ answers: shared.answers }} />;
    }

    return (
      <>
        {/*
          Every calculator screen and no other: entering a calculator is what
          opens an anonymous session, and browsing the picker is not entering
          one. Renders nothing.
        */}
        <CalculatorSession
          calculatorId={calculator.id}
          calculatorGroup={ref.electionKey}
          calculatorKey={ref.district}
          calculatorVersion={calculator.version}
        />
        {calculatorScreen(route, calculator, ref)}
      </>
    );
  }

  /*
   * The homepage is Phase 8. It gets the shell anyway — "Opustit kalkulačku"
   * lands here, and arriving at an unstyled page would read as having left the
   * app rather than as having reached a part of it that is still being built.
   */
  return (
    <AppShell>
      <main className={styles.placeholder}>
        <h1 className={styles.title}>{messages.comingSoon.title}</h1>
        <p className={styles.description}>{messages.comingSoon.description}</p>
      </main>
    </AppShell>
  );
}

/**
 * Which of the five calculator screens the step names.
 *
 * Lifted out of the page so the session component above can sit alongside all
 * of them without every case having to wrap itself in a fragment.
 */
function calculatorScreen(
  route: CalculatorRoute,
  calculator: Calculator,
  ref: CalculatorRef,
): ReactNode {
  const shellInfo = shellInfoOf(calculator, ref);

  switch (route.step) {
    case 'intro':
      return (
        <CalculatorIntro
          calculator={shellInfo}
          candidateCount={calculator.candidates.length}
          questions={calculator.questions}
        />
      );

    case 'guide':
      return <Guide calculator={shellInfo} />;

    case 'question': {
      const position = Number.parseInt(route.param ?? '1', 10);

      return (
        <QuestionFlow
          calculator={shellInfo}
          // Only the questions cross to the client; candidates and their
          // answers are only needed on the results screen.
          questions={calculator.questions}
          initialPosition={Number.isNaN(position) ? 1 : position}
        />
      );
    }

    case 'review':
      return <Recap calculator={shellInfo} questions={calculator.questions} />;

    /*
     * `comparison` deep-links into the same screen. The results list already
     * expands a candidate's full answer-by-answer comparison in place, so a
     * separate screen would be a second way to render the same thing —
     * Phase 5 decides whether one is actually wanted.
     */
    case 'result':
    case 'comparison':
      return <Results {...ref} calculator={calculator} />;
  }
}

/**
 * One title/description pair per route kind.
 *
 * The public shared result (below) is the one case with its own `og:image`
 * and Twitter card — everything else here just sets `title` (and, for the
 * home route, `description`) and lets the root layout's `title.template` do
 * the composing. The flow steps of a calculator — intro, guide, question,
 * recap, results — share one title: the step a visitor is on is UX state, not
 * a fact worth a different `<title>`, and a per-question title would have to
 * be fabricated since a question has no name of its own.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}): Promise<Metadata> {
  const { path } = await params;
  const route: ParsedRoute | null = parseRoute(path ?? [], routeSlugs());

  // Embed mode 404s in the page component above; it gets no metadata either.
  if (!route || route.embed) return {};

  const messages = getMessages();

  if (route.kind === 'home') {
    // No `title` here: the root layout's `title.template` wraps any title a
    // descendant segment sets, so an explicit `messages.app.title` here would
    // read "Volební kalkulačka · Volební kalkulačka". Omitting it is what
    // lets the layout's untemplated `default` stand.
    return { description: messages.app.description };
  }

  if (route.kind === 'election') {
    const election = await loadElection(route.electionKey);
    if (!election) return {};
    return { title: election.name };
  }

  // route.kind === 'calculator' from here down.

  /*
   * A public link to somebody's finished result — the one calculator URL
   * that is not the reader's own calculator, and the one screen with
   * metadata made to be posted: a picture and a sentence for unfurling.
   */
  if (route.step === 'result' && route.param) {
    const calculator = await loadCalculator(route.electionKey, route.district ?? '');
    if (!calculator) return {};

    // The same load the page makes, deduplicated by `cache()` — a 404 must
    // not become a page with a stranger's title.
    const shared = await loadSharedResult(route.param, calculator.id);
    if (!shared) return {};

    const title = format(messages.results.shared.metaTitle, {
      election: calculator.electionName,
    });
    const description = format(messages.results.shared.metaDescription, {
      calculator: calculator.name,
    });

    /*
     * There is no request object in `generateMetadata`, so the absolute URL
     * `og:image` requires cannot be derived from where this is being served —
     * it has to be configured. Left unset, Next resolves relative metadata
     * URLs against its own default (localhost in dev, and it warns in
     * production), which is exactly the behaviour a fork without this
     * variable had before.
     */
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const image = `/api/images/sessions/${shared.publicId}/opengraph`;

    return {
      ...(baseUrl ? { metadataBase: new URL(baseUrl) } : {}),
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: [{ url: image, width: 1200, height: 630 }],
      },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
  }

  const calculator = await loadCalculator(route.electionKey, route.district ?? '');
  if (!calculator) return {};

  return {
    title: format(messages.app.calculatorTitle, {
      calculator: calculator.name,
      election: calculator.electionName,
    }),
  };
}

/** Prerender the first question of every available calculator. */
export async function generateStaticParams() {
  return (await listAvailableCalculators()).map(({ electionKey, district }) => ({
    path: ['volby', electionKey, district, 'otazka', '1'],
  }));
}
