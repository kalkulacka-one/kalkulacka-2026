import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../button/button';
import { Dialog } from './dialog';

const meta = {
  title: 'Primitives/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
  args: {
    open: true,
    onClose: () => {},
    closeLabel: 'Zavřít',
    title: 'Začít znovu?',
    description:
      'Smažeme všechny vaše odpovědi v této kalkulačce a vrátíme vás na první otázku. Tuhle akci nelze vzít zpět.',
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Rendered open by default so the panel is visible in the docs — the real
 * control is the `open` prop, exercised by `Interactive` below.
 */
export const Confirm: Story = {
  args: {
    actions: (
      <>
        <Button variant="ghost">Zrušit</Button>
        <Button>Smazat a začít znovu</Button>
      </>
    ),
  },
};

/** No actions: a sheet you read and dismiss, like the flow's help overlay. */
export const Content: Story = {
  args: {
    size: 'wide',
    title: 'Jak to funguje',
    description: undefined,
    children: (
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        Táhněte kartu doleva pro souhlas, doprava pro nesouhlas. Otázku, na kterou nechcete
        odpovídat, přeskočte — do výsledku se nezapočítá.
      </p>
    ),
  },
};

/** Open, close with Escape or the backdrop, and open again — the full cycle. */
export const Interactive: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Otevřít dialog</Button>
        <Dialog
          {...args}
          open={open}
          onClose={() => setOpen(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={() => setOpen(false)}>Smazat a začít znovu</Button>
            </>
          }
        />
      </>
    );
  },
};
