import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ComparisonList, type ComparisonRow } from '../comparison-list/comparison-list';
import { MatchCard } from './match-card';

const rows: ComparisonRow[] = [
  {
    questionId: 'q1',
    statement: 'Město by mělo omezit vánoční výzdobu kvůli cenám energií.',
    user: { tone: 'agree', label: 'Ano' },
    candidate: { tone: 'agree', label: 'Ano' },
    agreement: 'match',
    important: true,
    comment: 'Úspory dávají smysl, výzdobu ale zcela rušit nechceme.',
  },
  {
    questionId: 'q2',
    statement: 'Město má vybudovat nový plavecký areál.',
    user: { tone: 'disagree', label: 'Ne' },
    candidate: { tone: 'agree', label: 'Ano' },
    agreement: 'mismatch',
  },
  {
    questionId: 'q3',
    statement: 'Parkování v centru má zdražit.',
    user: { tone: 'agree', label: 'Ano' },
    candidate: { tone: 'none', label: 'Bez odpovědi' },
    agreement: 'none',
  },
];

const meta = {
  title: 'Results/MatchCard',
  component: MatchCard,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>{Story()}</ul>],
  args: {
    rank: 1,
    name: 'Piráti a Starostové',
    description: 'Koalice Pirátů a hnutí STAN',
    matchPercentage: 78,
    percentLabel: '78 %',
    noAnswerLabel: 'Neodpověděli',
    toggleLabel: 'Porovnat odpovědi',
  },
} satisfies Meta<typeof MatchCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ranked: Story = {};

/**
 * KSČM in the Pardubice fixture: no answers at all. No bar, no percentage —
 * 0 % would read as "opposed on everything", which is a different claim.
 */
export const NeverAnswered: Story = {
  args: {
    rank: undefined,
    name: 'Komunistická strana Čech a Moravy',
    description: undefined,
    matchPercentage: undefined,
    percentLabel: undefined,
  },
};

export const WithComparison: Story = {
  render: (args) => {
    const [expanded, setExpanded] = useState(true);
    return (
      <MatchCard {...args} expanded={expanded} onToggle={() => setExpanded((open) => !open)}>
        <ComparisonList
          rows={rows}
          labels={{ you: 'Vy', candidate: 'Piráti', important: 'Pro mě důležité' }}
        />
      </MatchCard>
    );
  },
};
