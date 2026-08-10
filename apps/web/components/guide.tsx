import { getMessages } from '@vk/i18n';
import { Button, StickyBar } from '@vk/ui';
import Link from 'next/link';
import { type CalculatorShellInfo, questionPath, stepPath } from '../lib/paths';
import { GuidePractice } from './guide-practice';
import { Screen } from './screen';

export type GuideProps = {
  calculator: CalculatorShellInfo;
};

const messages = getMessages();

/**
 * How the flow works, before the first card.
 *
 * The screen itself stays a server component; only the practice card below it
 * is interactive, so the header, the back link and the sticky CTA still cost no
 * client JavaScript.
 *
 * It teaches operation and nothing else — which way to drag, which key to
 * press. What answering *means* (a star doubles the weight, a skip counts for
 * nothing, the recap can undo any of it) belongs to `/uvod` and is said there,
 * so this screen can be the card and the hands on it.
 */
export function Guide({ calculator }: GuideProps) {
  const { name: calculatorName, electionKey, district, embed } = calculator;
  const ref = { electionKey, district, embed };

  return (
    <Screen
      calculator={calculator}
      title={messages.guide.title}
      description={messages.guide.practiceLead}
      back={{ href: stepPath(ref, 'intro'), label: calculatorName }}
      footer={
        <StickyBar>
          <Button as={Link} href={questionPath(ref, 1)} size="large">
            {messages.guide.start}
          </Button>
        </StickyBar>
      }
    >
      <GuidePractice />
    </Screen>
  );
}
