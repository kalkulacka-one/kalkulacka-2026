import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from '../icon-button/icon-button';
import { AppHeader } from './app-header';

const meta = {
  title: 'Shell/AppHeader',
  component: AppHeader,
  parameters: { layout: 'padded' },
  args: {
    title: 'Volební kalkulačka',
    electionName: 'Komunální volby 2022',
    calculatorName: 'Pardubice',
    actions: <IconButton icon="list" label="Nabídka" variant="surface" />,
  },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Outside a calculator — the picker and the homepage carry the brand alone. */
export const BrandOnly: Story = {
  args: { electionName: undefined, calculatorName: undefined },
};

/** No region chosen yet: the election names itself, nothing between type and year. */
export const ElectionOnly: Story = {
  args: { calculatorName: undefined },
};

/** A long region name truncates rather than wrapping the bar to a second line. */
export const LongName: Story = {
  args: { calculatorName: 'Frýdek-Místek — obvod 3, Staré Město a okolí' },
};
