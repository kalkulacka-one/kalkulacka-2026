import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './avatar';

const meta = {
  title: 'Primitives/Avatar',
  component: Avatar,
  args: { name: 'Piráti a Starostové' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No logo in the data — the initials carry it. */
export const Initials: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Avatar {...args} size="small" />
      <Avatar {...args} size="medium" />
      <Avatar {...args} size="large" />
    </div>
  ),
};

/** A URL that cannot load falls back to the initials with no state change. */
export const BrokenImage: Story = {
  args: { src: 'https://archiv.volebnikalkulacka.cz/does-not-exist.png' },
};
