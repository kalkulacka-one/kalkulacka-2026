import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SearchField } from './search-field';

const meta = {
  title: 'Primitives/SearchField',
  component: SearchField,
  parameters: { layout: 'padded' },
  args: {
    label: 'Hledat město',
    placeholder: 'Hledat město',
    clearLabel: 'Vymazat hledání',
    value: '',
    onValueChange: () => {},
  },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/** The clear button only exists once there is something to clear. */
export const Interactive: Story = {
  render: (args) => {
    const [value, setValue] = useState('Pard');
    return <SearchField {...args} value={value} onValueChange={setValue} />;
  },
};

export const WithVisibleLabel: Story = {
  args: { hideLabel: false, value: 'Pardubice' },
};
