import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Zobrazit výsledky' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Přeskočit', iconEnd: 'chevronRight' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Začít znovu' },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Předchozí', iconStart: 'chevronLeft' },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Button {...args} size="small" />
      <Button {...args} size="medium" />
      <Button {...args} size="large" />
    </div>
  ),
};
