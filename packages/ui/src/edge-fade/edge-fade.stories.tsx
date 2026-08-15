import type { Meta, StoryObj } from '@storybook/react-vite';
import { EdgeFade } from './edge-fade';

const meta = {
  title: 'Primitives/EdgeFade',
  component: EdgeFade,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EdgeFade>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = Array.from({ length: 20 }, (_, index) => `Řádek ${index + 1}`);

/** Both edges over one scroll box — the only fade treatment lists get. */
export const OverAList: Story = {
  args: { edge: 'top' },
  render: () => (
    <div style={{ position: 'relative', height: '16rem' }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
        {rows.map((row) => (
          <p key={row} style={{ margin: 0, padding: '0.6rem 0' }}>
            {row}
          </p>
        ))}
      </div>
      <EdgeFade edge="top" />
      <EdgeFade edge="bottom" />
    </div>
  ),
};

/** The taller band a floating action sits in (`size="action"`). */
export const ActionBand: Story = {
  args: { edge: 'bottom', size: 'action' },
  render: (args) => (
    <div style={{ position: 'relative', height: '16rem' }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
        {rows.map((row) => (
          <p key={row} style={{ margin: 0, padding: '0.6rem 0' }}>
            {row}
          </p>
        ))}
      </div>
      <EdgeFade {...args} />
    </div>
  ),
};
