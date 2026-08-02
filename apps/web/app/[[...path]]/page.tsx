import { parseRoute } from '@vk/core';
import { getMessages } from '@vk/i18n';
import { notFound } from 'next/navigation';
import { QuestionFlow } from '../../components/question-flow';
import { listAvailableCalculators, loadCalculator } from '../../lib/calculators';
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

  if (route.kind === 'calculator' && route.step === 'question') {
    const calculator = loadCalculator(route.electionKey, route.district ?? '');
    if (!calculator) notFound();

    const position = Number.parseInt(route.param ?? '1', 10);

    return (
      <QuestionFlow
        calculatorId={calculator.id}
        calculatorName={calculator.name}
        electionName={calculator.electionName}
        electionKey={route.electionKey}
        district={route.district ?? ''}
        // Only the questions cross to the client; candidates and their answers
        // are only needed on the results screen.
        questions={calculator.questions}
        initialPosition={Number.isNaN(position) ? 1 : position}
      />
    );
  }

  // Everything else is Phase 3.
  return (
    <main className={styles.placeholder}>
      <h1 className={styles.title}>{messages.comingSoon.title}</h1>
      <p className={styles.description}>{messages.comingSoon.description}</p>
    </main>
  );
}

/** Prerender the first question of every available calculator. */
export function generateStaticParams() {
  return listAvailableCalculators().map(({ electionKey, district }) => ({
    path: ['volby', electionKey, district, 'otazka', '1'],
  }));
}
