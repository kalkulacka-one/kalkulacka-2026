import type { Meta, StoryObj } from '@storybook/react-vite';
import { Logo } from './logo';

const meta = {
  title: 'Primitives/Logo',
  component: Logo,
  args: { size: 24 },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Follows the surrounding text colour via currentColor. */
export const OnBrandColor: Story = {
  render: (args) => (
    <span style={{ color: 'var(--vk-color-agree)' }}>
      <Logo {...args} />
    </span>
  ),
};
