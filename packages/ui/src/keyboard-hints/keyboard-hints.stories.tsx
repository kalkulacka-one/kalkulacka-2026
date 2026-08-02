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
      { keys: [{ icon: 'arrowLeft', label: 'Šipka vlevo' }], label: 'Souhlasím' },
      { keys: [{ icon: 'arrowRight', label: 'Šipka vpravo' }], label: 'Nesouhlasím' },
      { keys: [{ icon: 'arrowUp', label: 'Šipka nahoru' }], label: 'Důležité' },
      { keys: [{ icon: 'arrowDown', label: 'Šipka dolů' }], label: 'Přeskočit' },
      {
        keys: [
          { icon: 'comma', label: 'Čárka' },
          { icon: 'period', label: 'Tečka' },
        ],
        label: 'Procházet bez odpovědi',
      },
    ],
  },
} satisfies Meta<typeof KeyboardHints>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
