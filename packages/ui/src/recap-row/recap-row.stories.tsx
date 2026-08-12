import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecapRow } from './recap-row';

const meta = {
  title: 'Recap/RecapRow',
  component: RecapRow,
  parameters: { layout: 'padded' },
  args: {
    title: 'Omezení vánoční výzdoby',
    tone: 'agree',
    important: false,
    labels: { answer: 'Ano', important: 'Pro mě důležité' },
    onOpen: () => {},
    onToggleImportant: () => {},
  },
  decorators: [
    (Story) => (
      <ul style={{ display: 'grid', gap: '0.5rem', margin: 0, padding: 0, maxWidth: '28rem' }}>
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof RecapRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Agree: Story = {};

export const Disagree: Story = {
  args: { tone: 'disagree', labels: { answer: 'Ne', important: 'Pro mě důležité' } },
};

/** Never reached — same dashed mark a skip gets, but the row stays full-strength. */
export const Unanswered: Story = {
  args: {
    tone: 'none',
    labels: { answer: 'Bez odpovědi', important: 'Pro mě důležité' },
  },
};

/** Explicitly passed over: the row reads as secondary and the star can't be armed. */
export const Skipped: Story = {
  args: {
    tone: 'none',
    skipped: true,
    labels: { answer: 'Bez odpovědi', important: 'Pro mě důležité' },
  },
};

export const Important: Story = {
  args: { important: true },
};

/** Long short-names wrap to a second line rather than truncating mid-word. */
export const LongTitle: Story = {
  args: {
    title: 'Regulace zábavní pyrotechniky mimo Silvestra dovoleno pouze v centru',
    important: true,
  },
};
