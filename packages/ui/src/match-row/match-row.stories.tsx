import type { Meta, StoryObj } from '@storybook/react-vite';
import { MatchRow } from './match-row';

const meta = {
  title: 'Results/MatchRow',
  component: MatchRow,
  parameters: { layout: 'padded' },
  args: {
    rank: 2,
    name: 'Žijeme Pardubice',
    matchPercentage: 74,
    percentLabel: '74 %',
    noAnswerLabel: 'Neodpověděli',
    onSelect: () => {},
  },
  decorators: [
    (Story) => (
      <ul style={{ display: 'grid', gap: '0.5rem', margin: 0, padding: 0, maxWidth: '26rem' }}>
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof MatchRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The top match: same row, one step up in scale. */
export const Winner: Story = {
  args: {
    rank: 1,
    name: 'Piráti: 42projektu.cz',
    matchPercentage: 81,
    percentLabel: '81 %',
    winner: true,
    winnerLabel: 'Největší shoda',
  },
};

/** The row whose comparison is currently open. */
export const Selected: Story = {
  args: { selected: true },
};

/**
 * KSČM: no answers at all, so no bar, no percentage, and nothing to open. Never
 * 0 %, which would read as "opposed on everything".
 */
export const NoAnswers: Story = {
  args: {
    rank: undefined,
    name: 'Komunistická strana Čech a Moravy',
    matchPercentage: undefined,
    percentLabel: undefined,
  },
};

/** Archive party names run to 85 characters; two lines is the ceiling. */
export const LongName: Story = {
  args: {
    rank: 6,
    name: 'SPOLEČNĚ PRO PARDUBICE (Pardubáci společně, Sdružení pro Pardubice, Pardubice pro lidi)',
    matchPercentage: 48,
    percentLabel: '48 %',
  },
};
