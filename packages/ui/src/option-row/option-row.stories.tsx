import type { Meta, StoryObj } from '@storybook/react-vite';
import { OptionRow } from './option-row';

const meta = {
  title: 'Entry/OptionRow',
  component: OptionRow,
  parameters: { layout: 'padded' },
  args: { label: 'Pardubice', as: 'button' },
} satisfies Meta<typeof OptionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Municipality: Story = {
  args: { meta: 'Komunální volby 2022' },
};

/** Senate districts show their number, municipalities do not. */
export const SenateDistrict: Story = {
  args: {
    label: 'Karlovy Vary',
    meta: 'Senátní volby 2022',
    leading: <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>1</span>,
  },
};

/** What Enter would pick in a search field elsewhere on the screen. */
export const Highlighted: Story = {
  args: { meta: 'Komunální volby 2022', highlighted: true },
};

export const List: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <OptionRow {...args} label="Brno" meta="Komunální volby 2022" />
      <OptionRow {...args} label="Pardubice" meta="Komunální volby 2022" />
      <OptionRow {...args} label="Plzeň" meta="Komunální volby 2022" />
    </div>
  ),
};
