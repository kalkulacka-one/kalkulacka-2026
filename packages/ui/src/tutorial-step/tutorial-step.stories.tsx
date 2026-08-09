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
    description: 'Táhněte kartu doleva, nebo tapněte na Souhlasím.',
  },
} satisfies Meta<typeof TutorialStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

/** The touch wording — the app picks it from the pointer, not the viewport. */
export const Touch: Story = {
  render: () => (
    <>
      <TutorialStep
        icon="arrowLeft"
        title="Souhlasím"
        description="Táhněte kartu doleva, nebo tapněte na Souhlasím."
      />
      <TutorialStep
        icon="arrowRight"
        title="Nesouhlasím"
        description="Táhněte kartu doprava, nebo tapněte na Nesouhlasím."
      />
      <TutorialStep
        icon="starThin"
        title="Pro mě důležité"
        description="Táhněte kartu šikmo nahoru, nebo tapněte na hvězdičku. Otázka s hvězdičkou má ve výsledku dvojnásobnou váhu."
      />
      <TutorialStep
        icon="arrowDown"
        title="Přeskočit"
        description="Otázku, na kterou nechcete odpovídat, táhněte dolů — do výsledku se nezapočítá."
      />
    </>
  ),
};

/** The same list on a desktop, where the shortcut is worth naming. */
export const Pointer: Story = {
  render: () => (
    <>
      <TutorialStep
        icon="arrowLeft"
        title="Souhlasím"
        description="Táhněte kartu doleva, stiskněte šipku vlevo, nebo klikněte na Souhlasím."
      />
      <TutorialStep
        icon="arrowRight"
        title="Nesouhlasím"
        description="Táhněte kartu doprava, stiskněte šipku vpravo, nebo klikněte na Nesouhlasím."
      />
      <TutorialStep
        icon="starThin"
        title="Pro mě důležité"
        description="Táhněte kartu šikmo nahoru, stiskněte šipku nahoru, nebo klikněte na hvězdičku. Otázka s hvězdičkou má ve výsledku dvojnásobnou váhu."
      />
      <TutorialStep
        icon="arrowDown"
        title="Přeskočit"
        description="Otázku, na kterou nechcete odpovídat, táhněte dolů nebo stiskněte šipku dolů — do výsledku se nezapočítá."
      />
    </>
  ),
};
