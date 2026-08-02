import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowNav } from './flow-nav';

const meta = {
  title: 'Flow/FlowNav',
  component: FlowNav,
  parameters: { layout: 'padded' },
  args: {
    position: 3,
    total: 42,
    canGoBack: true,
    previousLabel: 'Předchozí',
    forwardLabel: 'Přeskočit',
    counterLabel: 'Otázka 3 z 42',
    onPrevious: () => {},
    onForward: () => {},
  },
} satisfies Meta<typeof FlowNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing answered yet, so the forward control offers to skip. */
export const Unanswered: Story = {};

/** Once answered it reads "Další" instead. */
export const Answered: Story = {
  args: { forwardLabel: 'Další' },
};

/** On the first question there is nowhere back to go. */
export const AtStart: Story = {
  args: { position: 1, canGoBack: false, counterLabel: 'Otázka 1 z 42' },
};

/** A question that was explicitly skipped keeps the control filled. */
export const Skipped: Story = {
  args: { isSkipped: true },
};
