import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingIndicator } from './loading-indicator';

const meta = {
  title: 'Results/LoadingIndicator',
  component: LoadingIndicator,
  args: { label: 'Počítáme vaši shodu' },
} satisfies Meta<typeof LoadingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
