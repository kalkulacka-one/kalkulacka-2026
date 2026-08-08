import type { Meta, StoryObj } from '@storybook/react-vite';
import { Meter } from './meter';

const meta = {
  title: 'Primitives/Meter',
  component: Meter,
  args: { value: 72 },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(90vw, 16rem)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Agree: Story = {};

export const Neutral: Story = {
  args: { tone: 'neutral' },
};

export const Small: Story = {
  args: { size: 'small' },
};

/** Values outside 0–100 are clamped rather than overflowing the track. */
export const Clamped: Story = {
  args: { value: 140 },
};

/** The results list staggers these so the bars arrive with their rows. */
export const Delayed: Story = {
  args: { delay: 0.6 },
};

/** Labelled bars are announced as a meter; unlabelled ones are decorative only. */
export const Labelled: Story = {
  args: { value: 63, label: 'Shoda 63 %' },
};
