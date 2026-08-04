import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from './tag';

const meta = {
  title: 'Results/Tag',
  component: Tag,
  parameters: { layout: 'centered' },
  args: { children: 'Největší shoda' },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Agree: Story = {};

export const Neutral: Story = {
  args: { tone: 'neutral', children: 'Neodpověděli' },
};
