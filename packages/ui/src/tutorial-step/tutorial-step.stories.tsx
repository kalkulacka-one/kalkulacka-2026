import type { Meta, StoryObj } from '@storybook/react-vite';
import { TutorialStep } from './tutorial-step';

const meta = {
  title: 'Entry/TutorialStep',
  component: TutorialStep,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => <ul style={{ margin: 0, padding: 0, display: 'grid', gap: '1.5rem' }}>{Story()}</ul>,
  ],
  args: {
    icon: 'arrowLeft',
    title: 'Souhlasím',
    description: 'Táhněte kartu doleva, nebo klepněte na Souhlasím.',
  },
} satisfies Meta<typeof TutorialStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

/** Ticked off by the practice card on `/navod`. */
export const Done: Story = { args: { done: true, doneLabel: 'Vyzkoušeno' } };

/** Mid-practice: what the checklist looks like with two of four tried. */
export const PartlyDone: Story = {
  render: () => (
    <>
      <TutorialStep
        icon="arrowLeft"
        title="Souhlasím"
        description="Táhněte kartu doleva, nebo klepněte na Souhlasím."
        done
        doneLabel="Vyzkoušeno"
      />
      <TutorialStep
        icon="arrowRight"
        title="Nesouhlasím"
        description="Táhněte kartu doprava, nebo klepněte na Nesouhlasím."
        done
        doneLabel="Vyzkoušeno"
      />
      <TutorialStep
        icon="starThin"
        title="Pro mě důležité"
        description="Otázka označená hvězdičkou má ve výsledku dvojnásobnou váhu."
        done={false}
      />
      <TutorialStep
        icon="arrowDown"
        title="Přeskočit"
        description="Otázku, na kterou nechcete odpovídat, můžete přeskočit."
        done={false}
      />
    </>
  ),
};

/** The set as the tutorial screen shows it. */
export const Sequence: Story = {
  render: () => (
    <>
      <TutorialStep
        icon="arrowLeft"
        title="Souhlasím"
        description="Táhněte kartu doleva, nebo klepněte na Souhlasím."
      />
      <TutorialStep
        icon="arrowRight"
        title="Nesouhlasím"
        description="Táhněte kartu doprava, nebo klepněte na Nesouhlasím."
      />
      <TutorialStep
        icon="starThin"
        title="Pro mě důležité"
        description="Otázka označená hvězdičkou má ve výsledku dvojnásobnou váhu."
      />
      <TutorialStep
        icon="arrowDown"
        title="Přeskočit"
        description="Otázku, na kterou nechcete odpovídat, můžete přeskočit."
      />
    </>
  ),
};
