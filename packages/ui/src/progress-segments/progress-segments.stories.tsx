import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressSegments, type Segment } from './progress-segments';

const meta = {
  title: 'Flow/ProgressSegments',
  component: ProgressSegments,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ProgressSegments>;

export default meta;
type Story = StoryObj<typeof meta>;

const partial: Segment[] = [
  { state: 'agree' },
  { state: 'agree', important: true },
  { state: 'disagree' },
  { state: 'skipped' },
  { state: 'disagree', important: true },
  { state: 'unanswered' },
  { state: 'unanswered' },
  { state: 'unanswered' },
];

export const PartiallyAnswered: Story = {
  args: { segments: partial, currentIndex: 5, label: 'Otázka 6 z 8' },
};

/** 42 questions is the real Pardubice count — the segments get thin. */
export const FullLength: Story = {
  args: {
    segments: Array.from({ length: 42 }, (_, i): Segment => {
      if (i > 25) return { state: 'unanswered' };
      if (i % 7 === 0) return { state: 'skipped' };
      if (i % 3 === 0) return { state: 'disagree', important: i % 6 === 0 };
      return { state: 'agree', important: i % 5 === 0 };
    }),
    currentIndex: 26,
    label: 'Otázka 27 z 42',
  },
};
