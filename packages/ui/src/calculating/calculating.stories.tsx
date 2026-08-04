import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calculating } from './calculating';

const meta = {
  title: 'Results/Calculating',
  component: Calculating,
  parameters: { layout: 'centered' },
  args: { label: 'Počítáme vaši shodu' },
} satisfies Meta<typeof Calculating>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Runs once on mount. Re-render the story (the toolbar's reload) to watch it
 * again — the animation is deliberately not looped, because it resolves.
 */
export const Default: Story = {};
