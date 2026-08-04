import type { Meta, StoryObj } from '@storybook/react-vite';
import { AnswerMark } from './answer-mark';

const meta = {
  title: 'Answers/AnswerMark',
  component: AnswerMark,
  parameters: { layout: 'centered' },
  args: { tone: 'agree', label: 'Souhlasím' },
} satisfies Meta<typeof AnswerMark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The four states, at the size the recap uses. */
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <AnswerMark tone="agree" label="Souhlasím" />
      <AnswerMark tone="disagree" label="Nesouhlasím" />
      <AnswerMark tone="neutral" label="Nevím" />
      <AnswerMark tone="none" label="Bez odpovědi" />
    </div>
  ),
};

/** The comparison's size, where two sit side by side on every row. */
export const Small: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <AnswerMark tone="agree" label="Souhlasím" size="small" />
      <AnswerMark tone="disagree" label="Nesouhlasím" size="small" />
      <AnswerMark tone="neutral" label="Nevím" size="small" />
      <AnswerMark tone="none" label="Bez odpovědi" size="small" />
    </div>
  ),
};
