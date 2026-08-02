import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RecapItem } from './recap-item';

const labels = {
  agree: 'Ano',
  disagree: 'Ne',
  important: 'Pro mě důležité',
  skipped: 'Přeskočeno',
  open: 'Otevřít otázku 7',
};

const meta = {
  title: 'Recap/RecapItem',
  component: RecapItem,
  parameters: { layout: 'padded' },
  // The component is a list row; the story supplies the list it belongs in.
  decorators: [(Story) => <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>{Story()}</ul>],
  args: {
    position: 7,
    statement: 'Město by mělo omezit vánoční výzdobu kvůli cenám energií.',
    title: 'Omezení vánoční výzdoby',
    topic: 'Energetika',
    agree: false,
    disagree: false,
    important: false,
    skipped: false,
    labels,
    onAnswer: () => {},
    onToggleImportant: () => {},
    onOpen: () => {},
  },
} satisfies Meta<typeof RecapItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Never reached — the state the recap exists to surface. */
export const Unanswered: Story = {};

export const Answered: Story = {
  args: { agree: true },
};

export const ImportantAndAnswered: Story = {
  args: { disagree: true, important: true },
};

export const Skipped: Story = {
  args: { skipped: true },
};

/** Editing in place, wired the way the recap screen wires it. */
export const Editable: Story = {
  render: (args) => {
    const [answer, setAnswer] = useState<boolean | undefined>(undefined);
    const [important, setImportant] = useState(false);

    return (
      <RecapItem
        {...args}
        agree={answer === true}
        disagree={answer === false}
        important={important}
        onAnswer={(agree) => setAnswer((current) => (current === agree ? undefined : agree))}
        onToggleImportant={() => setImportant((current) => !current)}
      />
    );
  },
};
