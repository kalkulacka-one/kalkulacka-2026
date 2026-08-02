import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from './chip';

const meta = {
  title: 'Primitives/Chip',
  component: Chip,
  args: { children: 'Energetika' },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = {
  args: { children: 'Energetika', variant: 'filled' },
};

export const Outline: Story = {
  args: { children: 'Omezení vánoční výzdoby', variant: 'outline' },
};

/** How they appear on a question card: topic first, then the question's short name. */
export const Pair: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <Chip variant="filled">Energetika</Chip>
      <Chip variant="outline">Omezení vánoční výzdoby</Chip>
    </div>
  ),
};
