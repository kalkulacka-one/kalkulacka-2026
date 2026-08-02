import { getMessages } from '@vk/i18n';
import { Button, StickyBar, TutorialStep } from '@vk/ui';
import Link from 'next/link';
import { type CalculatorRef, questionPath, stepPath } from '../lib/paths';
import styles from './guide.module.css';
import { Screen } from './screen';

export type GuideProps = {
  calculatorName: string;
  electionName: string;
} & CalculatorRef;

const messages = getMessages();

/**
 * How the flow works, before the first card.
 *
 * A server component — nothing here reads the answer store, so it costs no
 * client JavaScript. The functional-first pass explains the gestures in words;
 * teaching them with a live demo card is Phase 6.
 */
export function Guide({ calculatorName, electionName, electionKey, district }: GuideProps) {
  const ref = { electionKey, district };

  return (
    <Screen
      eyebrow={`${calculatorName} · ${electionName}`}
      title={messages.guide.title}
      back={{ href: stepPath(ref, 'intro'), label: calculatorName }}
      footer={
        <StickyBar>
          <Button as={Link} href={questionPath(ref, 1)} size="large">
            {messages.guide.start}
          </Button>
        </StickyBar>
      }
    >
      <ul className={styles.steps}>
        <TutorialStep
          icon="arrowLeft"
          title={messages.guide.agreeTitle}
          description={messages.guide.agreeDescription}
        />
        <TutorialStep
          icon="arrowRight"
          title={messages.guide.disagreeTitle}
          description={messages.guide.disagreeDescription}
        />
        <TutorialStep
          icon="starThin"
          title={messages.guide.importantTitle}
          description={messages.guide.importantDescription}
        />
        <TutorialStep
          icon="arrowDown"
          title={messages.guide.skipTitle}
          description={messages.guide.skipDescription}
        />
        <TutorialStep
          icon="list"
          title={messages.guide.recapTitle}
          description={messages.guide.recapDescription}
        />
      </ul>
    </Screen>
  );
}
