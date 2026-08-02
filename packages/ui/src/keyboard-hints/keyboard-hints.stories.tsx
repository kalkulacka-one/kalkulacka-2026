import type { Meta, StoryObj } from '@storybook/react-vite';
import { KeyboardHints } from './keyboard-hints';

const meta = {
  title: 'Flow/KeyboardHints',
  component: KeyboardHints,
  parameters: {
    layout: 'padded',
    // Hidden below 860px by design — widen the Storybook viewport to see it.
    viewport: { defaultViewport: 'desktop' },
  },
  args: {
    hints: [
      { keys: ['←', '→'], label: 'odpovědět' },
      { keys: ['↑'], label: 'důležité' },
      { keys: ['↓'], label: 'přeskočit' },
      { keys: [',', '.'], label: 'procházet bez odpovědi' },
    ],
  },
} satisfies Meta<typeof KeyboardHints>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
