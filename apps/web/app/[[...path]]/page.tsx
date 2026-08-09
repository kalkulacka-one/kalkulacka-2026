import { parseRoute } from '@vk/core';
import { getMessages } from '@vk/i18n';
import { notFound } from 'next/navigation';
import { AppShell } from '../../components/app-shell';
import { CalculatorIntro } from '../../components/calculator-intro';
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
import { shellInfoOf, stepPath } from '../../lib/paths';
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
  const route = parseRoute(path ?? []);
  const messages = getMessages();

  if (!route) notFound();

  // Embed mode is parsed by @vk/core but not yet rendered — Phase 7 builds it.
  // Until then, an embed URL 404s rather than silently serving the full app
  // shell to a partner expecting a stripped-down embed.
  if (route.embed) notFound();

  if (route.kind === 'election') {
    const election = loadElection(route.electionKey);
    if (!election) notFound();

    const districts: PickerDistrict[] = listDistricts(route.electionKey).map((district) => ({
      code: district.code,
      name: district.name,
      slug: district.slug,
      showCode: district.showCode,
      available: district.available,
      href: stepPath({ electionKey: route.electionKey, district: district.slug }, 'intro'),
    }));

    return (
      <DistrictPicker
        electionName={election.name}
        districtKind={election.districtKind}
        districts={districts}
      />
    );
  }

  if (route.kind === 'calculator') {
    const calculator = loadCalculator(route.electionKey, route.district ?? '');
    if (!calculator) notFound();

    const ref = { electionKey: route.electionKey, district: route.district ?? '' };
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

/** Prerender the first question of every available calculator. */
export function generateStaticParams() {
  return listAvailableCalculators().map(({ electionKey, district }) => ({
    path: ['volby', electionKey, district, 'otazka', '1'],
  }));
}
