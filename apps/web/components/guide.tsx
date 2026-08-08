import { getMessages } from '@vk/i18n';
import { Button, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { type CalculatorShellInfo, questionPath, stepPath } from '../lib/paths';
import { GuideSteps } from './guide-steps';
import { Screen } from './screen';

export type GuideProps = {
  calculator: CalculatorShellInfo;
};

const messages = getMessages();

/**
 * How the flow works, before the first card.
 *
 * A server component — nothing here reads the answer store, so it costs no
 * client JavaScript. The functional-first pass explains the gestures in words;
 * teaching them with a live demo card is Phase 6.
 */
export function Guide({ calculator }: GuideProps) {
  const { name: calculatorName, electionKey, district } = calculator;
  const ref = { electionKey, district };

  return (
    <Screen
      calculator={calculator}
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
      <GuideSteps />
    </Screen>
  );
}
