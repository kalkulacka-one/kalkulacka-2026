import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnswerPill } from './answer-pill';

const meta = {
  title: 'Results/AnswerPill',
  component: AnswerPill,
  args: { tone: 'agree', label: 'Ano' },
} satisfies Meta<typeof AnswerPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All four states side by side — "bez odpovědi" must not read as a position. */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <AnswerPill tone="agree" label="Ano" />
      <AnswerPill tone="disagree" label="Ne" />
      <AnswerPill tone="neutral" label="Nevím" />
      <AnswerPill tone="none" label="Bez odpovědi" />
    </div>
  ),
};

export const Small: Story = {
  args: { size: 'small' },
};
