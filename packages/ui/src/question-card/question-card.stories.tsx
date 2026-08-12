import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuestionCard } from './question-card';

const content = {
  id: 'q1',
  topic: 'Energetika',
  title: 'Omezení vánoční výzdoby',
  statement:
    'Město by mělo kvůli rostoucím cenám energie omezit veřejné slavnostní osvětlení v době Vánoc.',
  detail:
    'K podobnému kroku přistoupila například rakouská Vídeň. Na hlavním bulváru Ring kolem centra nebude vánoční osvětlení vůbec, na dalších místech se bude rozsvěcet o hodinu později než doposud.',
};

const labels = {
  agree: 'Ano',
  disagree: 'Ne',
  important: 'Pro mě důležité',
};

/**
 * The card positions itself absolutely, so stories give it a box to fill —
 * the same job the flow's "stage" element does in the app.
 */
const meta = {
  title: 'Flow/QuestionCard',
  component: QuestionCard,
  parameters: { layout: 'centered' },
  args: {
    content,
    labels,
    selection: { agree: false, disagree: false, important: false },
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 'min(90vw, 51.25rem)', height: '33.75rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unanswered: Story = {};

export const Agreed: Story = {
  args: { selection: { agree: true, disagree: false, important: false } },
};

export const DisagreedAndImportant: Story = {
  args: { selection: { agree: false, disagree: true, important: true } },
};

/** Questions without an explainer are common in the archive data. */
export const WithoutDetail: Story = {
  args: {
    content: {
      ...content,
      detail: undefined,
      title: 'Fotovoltaika na městské budovy',
      statement: 'Město má investovat do fotovoltaických panelů na střechách městských budov.',
    },
  },
};

/** Tags are empty for some data sources; the card drops to a single chip. */
export const WithoutTopic: Story = {
  args: { content: { ...content, topic: undefined } },
};

/** Only the recap's dialog passes this — the deck's own cards never close. */
export const Closable: Story = {
  args: { close: { label: 'Zavřít', onClose: () => {} } },
};

/** The longest statement and explainer in the Pardubice set. */
export const LongestContent: Story = {
  args: {
    content: {
      id: 'q-long',
      topic: 'Bydlení',
      title: 'Podpora družstevního bydlení',
      statement:
        'Město má podporovat družstevní a spolkové formy bytové výstavby i subjekty, které budou poskytovat bydlení na neziskovém principu.',
      detail:
        'Kritikům vadí, že ekonomické tlaky na původní obyvatele vedou k jejich postupnému vytlačování. Městské části pak ztrácejí pestrost a uzavírají se jen pro vybrané skupiny lidí. Zastánci tvrdí, že to je přirozený proces a že na bydlení v dobré čtvrti si člověk musí vydělat.',
    },
  },
};
