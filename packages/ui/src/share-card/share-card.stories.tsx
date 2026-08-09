import type { Meta, StoryObj } from '@storybook/react-vite';
import { CARD_FORMATS } from './card-format';
import { ShareCard } from './share-card';
import { CARD_THEMES } from './theme-colors';

const content = {
  title: 'Vaše shoda',
  subtitle: 'Komunální volby 2022 · Pardubice',
  winnerLabel: 'Největší shoda',
  entries: [
    { rank: 1, name: 'SPOLU', percentLabel: '87 %', matchPercentage: 87 },
    { rank: 2, name: 'Piráti a Starostové', percentLabel: '74 %', matchPercentage: 74 },
    { rank: 3, name: 'ANO 2011', percentLabel: '61 %', matchPercentage: 61 },
    { rank: 4, name: 'Společně pro Pardubice', percentLabel: '52 %', matchPercentage: 52 },
    { rank: 5, name: 'SPD', noAnswerLabel: 'Neodpověděli' },
  ],
  note: 'Zodpovězeno 38 z 40 otázek',
  url: 'volebnikalkulacka.cz',
};

/**
 * The image someone posts. Built out of the app's own `MatchRow`/`Avatar`
 * components rather than redrawn, so the preview here — a scaled-down instance
 * of the same layout the export rasterises — cannot drift from either.
 */
const meta = {
  title: 'Results/ShareCard',
  component: ShareCard,
  args: { content, theme: 'light', format: 'story', size: 360, label: 'Náhled' },
  argTypes: {
    theme: { control: 'inline-radio', options: CARD_THEMES },
    format: { control: 'inline-radio', options: CARD_FORMATS },
  },
} satisfies Meta<typeof ShareCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Story_: Story = { name: 'Story', args: { format: 'story' } };
export const Landscape: Story = { args: { format: 'landscape', size: 520 } };

/** The two brand colourways, derived from whatever the theme calls agree and disagree. */
export const Themes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {CARD_THEMES.map((theme) => (
        <ShareCard key={theme} {...args} theme={theme} size={240} />
      ))}
    </div>
  ),
};
