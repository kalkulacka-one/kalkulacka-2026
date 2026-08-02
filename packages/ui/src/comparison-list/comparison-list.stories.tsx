import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComparisonList } from './comparison-list';

const meta = {
  title: 'Results/ComparisonList',
  component: ComparisonList,
  parameters: { layout: 'padded' },
  args: {
    labels: { you: 'Vy', candidate: 'Piráti', important: 'Pro mě důležité' },
    rows: [
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
    ],
  },
} satisfies Meta<typeof ComparisonList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All three agreement states, including the one neither side can be blamed for. */
export const Default: Story = {};
