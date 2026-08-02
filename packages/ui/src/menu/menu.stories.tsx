import type { Meta, StoryObj } from '@storybook/react-vite';
import { Menu } from './menu';

const meta = {
  title: 'Primitives/Menu',
  component: Menu,
  parameters: { layout: 'padded' },
  args: {
    label: 'Nabídka',
    items: [
      {
        id: 'help',
        label: 'Jak to funguje',
        detail: 'Připomenutí, jak se odpovídá',
        icon: 'info',
        onSelect: () => {},
      },
      {
        id: 'restart',
        label: 'Začít znovu',
        detail: 'Smaže vaše odpovědi',
        icon: 'restart',
        onSelect: () => {},
      },
      {
        id: 'leave',
        label: 'Opustit kalkulačku',
        detail: 'Postup zůstane uložený',
        icon: 'exit',
        onSelect: () => {},
      },
    ],
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Open it and try the keyboard: focus lands on the first item, ↑/↓ cycle,
 * Escape closes and hands focus back to the trigger, Tab leaves.
 */
export const Default: Story = {
  render: (args) => (
    // Right-aligned, since the popover hangs from the trigger's right edge —
    // the same corner it occupies in the app header.
    <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '20rem' }}>
      <Menu {...args} />
    </div>
  ),
};

/** Outside a calculator only one action applies, so only one is offered. */
export const SingleItem: Story = {
  args: {
    items: [
      {
        id: 'help',
        label: 'Jak to funguje',
        detail: 'Připomenutí, jak se odpovídá',
        icon: 'info',
        onSelect: () => {},
      },
    ],
  },
  render: (args) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: '14rem' }}>
      <Menu {...args} />
    </div>
  ),
};
