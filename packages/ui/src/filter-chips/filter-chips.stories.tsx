import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FilterChips, type FilterChipsProps } from './filter-chips';

const OPTIONS = [
  { id: 'all', label: 'Vše', count: 42 },
  { id: 'unanswered', label: 'Nezodpovězené', count: 28 },
  { id: 'important', label: 'Důležité', count: 4 },
  { id: 'topic:doprava', label: 'Doprava', count: 7, separatorBefore: true },
  { id: 'topic:bydleni', label: 'Bydlení', count: 5 },
  { id: 'topic:energetika', label: 'Energetika', count: 8 },
  { id: 'topic:skolstvi', label: 'Školství', count: 4 },
  { id: 'topic:socialni', label: 'Sociální politika', count: 6 },
  { id: 'topic:kultura', label: 'Kultura a sport', count: 3 },
];

const meta = {
  title: 'Primitives/FilterChips',
  component: FilterChips,
  parameters: { layout: 'padded' },
  args: {
    label: 'Filtrovat otázky',
    options: OPTIONS,
    value: 'all',
    onChange: () => {},
  },
} satisfies Meta<typeof FilterChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TopicSelected: Story = {
  args: { value: 'topic:energetika' },
};

/** The row scrolls sideways rather than wrapping; drag it to see the rest. */
export const Narrow: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '20rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Interactive = {
  render: (args: FilterChipsProps) => {
    const [value, setValue] = useState('all');
    return <FilterChips {...args} value={value} onChange={setValue} />;
  },
} satisfies StoryObj<typeof meta>;
