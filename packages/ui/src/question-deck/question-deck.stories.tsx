import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { QuestionCardContent } from '../question-card/question-card';
import { QuestionDeck } from './question-deck';

const QUESTIONS: QuestionCardContent[] = [
  {
    id: 'q1',
    topic: 'Energetika',
    title: 'Omezení vánoční výzdoby',
    statement:
      'Město by mělo kvůli rostoucím cenám energie omezit veřejné slavnostní osvětlení v době Vánoc.',
    detail:
      'K podobnému kroku přistoupila například rakouská Vídeň. Na hlavním bulváru Ring kolem centra nebude vánoční osvětlení vůbec.',
  },
  {
    id: 'q2',
    topic: 'Veřejný pořádek',
    title: 'Regulace zábavní pyrotechniky',
    statement: 'Používání zábavní pyrotechniky jindy než na Silvestra má být ve městě zakázané.',
    detail:
      'V případě neregulace bývají problematické hlavně letní měsíce, kdy jsou ohňostroje součástí řady domácích oslav.',
  },
  {
    id: 'q3',
    topic: 'Bydlení',
    title: 'Bytový fond',
    statement: 'Město má budovat a udržovat vlastní bytový fond.',
    detail: 'Odpůrci tvrdí, že soukromí majitelé se o nemovitosti postarají lépe.',
  },
  {
    id: 'q4',
    topic: 'Doprava',
    title: 'MHD zdarma',
    statement: 'Měla by být městská hromadná doprava pro všechny rezidenty zdarma?',
  },
];

const labels = {
  agree: 'Souhlasím',
  disagree: 'Nesouhlasím',
  important: 'Pro mě důležité',
  importantSuffix: ' · Pro mě důležité',
  skip: 'Přeskočit',
};

/**
 * Fully interactive: drag the card left to agree, right to disagree, down to
 * skip, and up-and-across to also mark it important. Arrow keys do the same.
 */
function DeckHarness({ guides = false }: { guides?: boolean }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, { agree: boolean; disagree: boolean; important: boolean }>
  >({});

  const current = QUESTIONS[index % QUESTIONS.length] as QuestionCardContent;
  const selection = answers[current.id] ?? { agree: false, disagree: false, important: false };

  const advance = () => setIndex((i) => (i + 1) % QUESTIONS.length);

  return (
    <div style={{ position: 'relative', width: 'min(90vw, 51.25rem)', height: '33.75rem' }}>
      <QuestionDeck
        current={current}
        next={QUESTIONS[(index + 1) % QUESTIONS.length]}
        after={QUESTIONS[(index + 2) % QUESTIONS.length]}
        selection={selection}
        labels={labels}
        onAnswer={(agree, important) => {
          setAnswers((prev) => ({
            ...prev,
            [current.id]: { agree, disagree: !agree, important },
          }));
          advance();
        }}
        dragGuides={guides ? { practised: new Set(['w'] as const) } : undefined}
        onSkip={advance}
        onToggleImportant={() =>
          setAnswers((prev) => ({
            ...prev,
            [current.id]: { ...selection, important: !selection.important },
          }))
        }
      />
    </div>
  );
}

const meta = {
  title: 'Flow/QuestionDeck',
  component: QuestionDeck,
  parameters: { layout: 'centered' },
  args: {
    current: QUESTIONS[0] as QuestionCardContent,
    selection: { agree: false, disagree: false, important: false },
    labels,
    onAnswer: () => {},
    onSkip: () => {},
    onToggleImportant: () => {},
  },
} satisfies Meta<typeof QuestionDeck>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  render: () => <DeckHarness />,
};

/**
 * The tutorial's practice deck: arrows around the statement for every direction
 * the card can leave in, lighting up as a drag reaches them. "Souhlasím" starts
 * faded here, as it does once it has been tried.
 */
export const WithDragGuides: Story = {
  render: () => <DeckHarness guides />,
};
