import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../button/button';
import { QuestionDialog, type QuestionDialogProps } from './question-dialog';

const QUESTION = {
  id: 'q-21',
  statement:
    'Město by mělo kvůli rostoucím cenám energie omezit veřejné slavnostní osvětlení v době Vánoc.',
  title: 'Omezení vánoční výzdoby',
  detail:
    'Vánoční osvětlení stojí město zhruba 1,2 milionu korun ročně. Část zastupitelů navrhuje jeho omezení, jiní upozorňují na dopad na centrum města.',
  topic: 'Energetika',
};

const meta = {
  title: 'Recap/QuestionDialog',
  component: QuestionDialog,
  parameters: { layout: 'fullscreen' },
  args: {
    question: QUESTION,
    selection: { agree: false, disagree: false, important: false },
    labels: {
      agree: 'Ano',
      disagree: 'Ne',
      important: 'Pro mě důležité',
      skip: 'Přeskočit',
      close: 'Zavřít',
    },
    onClose: () => {},
    onAnswer: () => {},
    onSkip: () => {},
    onToggleImportant: () => {},
  },
} satisfies Meta<typeof QuestionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open by default so the card is visible in the docs. */
export const Unanswered: Story = {};

export const Answered: Story = {
  args: { selection: { agree: true, disagree: false, important: true } },
};

/** `question: undefined` is what closes it — there is no separate `open` flag. */
export const Interactive = {
  render: (args: QuestionDialogProps) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: '2rem' }}>
        <Button onClick={() => setOpen(true)}>Otevřít otázku</Button>
        <QuestionDialog
          {...args}
          question={open ? QUESTION : undefined}
          onClose={() => setOpen(false)}
        />
      </div>
    );
  },
} satisfies StoryObj<typeof meta>;
