import { getPardubiceCalculator, toSegments } from '@vk/core';
import { Button, Card, Chip, ProgressSegments } from '@vk/ui';
import styles from './page.module.css';

/**
 * Phase 1 checkpoint.
 *
 * Not the real question screen — that is Phase 2. This exists to prove the
 * whole stack lines up outside Storybook: real archive data through the
 * adapter, rendered by design-system components, styled entirely from tokens.
 */
export default function HomePage() {
  const calculator = getPardubiceCalculator();
  const question = calculator.questions[0];
  const segments = toSegments(calculator.questions, {});

  if (!question) return null;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <p className={styles.brand}>Volební kalkulačka</p>
        <p className={styles.subtitle}>
          {calculator.name} · {calculator.electionName}
        </p>
      </header>

      <ProgressSegments
        segments={segments}
        currentIndex={0}
        label={`Otázka 1 z ${calculator.questions.length}`}
      />

      <Card as="article" className={styles.card}>
        <div className={styles.chips}>
          {question.tags[0] ? <Chip variant="filled">{question.tags[0]}</Chip> : null}
          <Chip variant="outline">{question.title}</Chip>
        </div>

        <h1 className={styles.statement}>{question.statement}</h1>
        {question.detail ? <p className={styles.detail}>{question.detail}</p> : null}
      </Card>

      <footer className={styles.footer}>
        <Button variant="ghost" iconStart="chevronLeft" disabled>
          Předchozí
        </Button>
        <span className={styles.counter}>
          <strong>1</strong>/{calculator.questions.length}
        </span>
        <Button variant="ghost" iconEnd="chevronRight">
          Přeskočit
        </Button>
      </footer>
    </main>
  );
}
