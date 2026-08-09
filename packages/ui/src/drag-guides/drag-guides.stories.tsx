import type { Meta, StoryObj } from '@storybook/react-vite';
import { DragGuides } from './drag-guides';

const LABELS = {
  agree: 'Souhlasím',
  disagree: 'Nesouhlasím',
  important: 'Pro mě důležité',
  skip: 'Přeskočit',
};

const meta = {
  title: 'Flow/DragGuides',
  component: DragGuides,
  parameters: { layout: 'padded' },
  args: { labels: LABELS },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 320, height: 220 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DragGuides>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Touch: icon-only pills, one diagonal arrow per "important" corner. */
export const Touch: Story = {};

/** Mouse: labelled pills, diagonals decomposed into an up arrow plus the answer's own arrow. */
export const Pointer: Story = {
  args: { split: true },
};

export const Practised: Story = {
  args: { split: true, practised: new Set(['w', 's']) },
};

export const ActiveDrag: Story = {
  args: { split: true, active: 'ne' },
};
