import type { Meta, StoryObj } from '@storybook/react-vite';
import { Backdrop } from '../backdrop/backdrop';
import { IconButton } from './icon-button';

const meta = {
  title: 'Primitives/IconButton',
  component: IconButton,
  parameters: { layout: 'padded' },
  args: { icon: 'list', label: 'Nabídka' },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const Large: Story = {
  args: { size: 'large' },
};

/**
 * The variant the app header uses. Shown over the live backdrop because that is
 * the whole reason it exists: the colour behind this button changes every frame,
 * so it carries its own plate rather than trusting the page underneath.
 */
export const SurfaceOverBackdrop: Story = {
  args: { variant: 'surface' },
  render: (args) => (
    <div style={{ position: 'relative', height: '10rem', display: 'grid', placeItems: 'center' }}>
      <Backdrop forceEnabled />
      <div style={{ position: 'relative' }}>
        <IconButton {...args} />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  args: { variant: 'surface', disabled: true },
};
