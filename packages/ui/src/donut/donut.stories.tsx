import type { Meta, StoryObj } from '@storybook/react-vite';
import { Donut } from './donut';

const meta = {
  title: 'Results/Donut',
  component: Donut,
  parameters: { layout: 'centered' },
  args: {
    centerValue: '42',
    centerLabel: 'otázek',
    segments: [
      { tone: 'agree', value: 24, label: 'Souhlas' },
      { tone: 'disagree', value: 12, label: 'Nesouhlas' },
      { tone: 'none', value: 6, label: 'Bez odpovědi' },
    ],
  },
} satisfies Meta<typeof Donut>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The real Pardubice shape for someone who answered 36 of 42. */
export const Default: Story = {};

/** With explicit "nevím" answers in the mix — all four tones at once. */
export const WithNeutral: Story = {
  args: {
    segments: [
      { tone: 'agree', value: 18, label: 'Souhlas' },
      { tone: 'disagree', value: 11, label: 'Nesouhlas' },
      { tone: 'neutral', value: 7, label: 'Nevím' },
      { tone: 'none', value: 6, label: 'Bez odpovědi' },
    ],
  },
};

/** Answered everything one way — a single segment gets no gap cut into it. */
export const Single: Story = {
  args: { segments: [{ tone: 'agree', value: 42, label: 'Souhlas' }] },
};

/** Segments worth nothing are dropped rather than drawn as stray dots. */
export const WithEmptySegments: Story = {
  args: {
    segments: [
      { tone: 'agree', value: 30, label: 'Souhlas' },
      { tone: 'disagree', value: 0, label: 'Nesouhlas' },
      { tone: 'neutral', value: 0, label: 'Nevím' },
      { tone: 'none', value: 12, label: 'Bez odpovědi' },
    ],
  },
};
