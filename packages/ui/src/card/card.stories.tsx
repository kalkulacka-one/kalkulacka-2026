import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card';

const meta = {
  title: 'Primitives/Card',
  component: Card,
  args: {
    children: 'Card content',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(90vw, 20rem)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Unpadded: Story = {
  args: { padded: false },
};

/** The deck's stacked-back cards, one elevation step apart. */
export const ElevationSteps: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Card elevation="back">back</Card>
      <Card elevation="next">next</Card>
      <Card elevation="default">default</Card>
      <Card elevation="lifted">lifted</Card>
    </div>
  ),
};

/** `as` lets a card be a real interactive element, e.g. a `<button>` row. */
export const AsButton: Story = {
  args: { as: 'button', children: 'Clickable card', onClick: () => {} },
};
