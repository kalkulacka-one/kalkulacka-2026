import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button/button';
import { StickyBar } from './sticky-bar';

const meta = {
  title: 'Primitives/StickyBar',
  component: StickyBar,
  parameters: { layout: 'fullscreen' },
  args: { children: <Button size="large">Zobrazit výsledky</Button> },
} satisfies Meta<typeof StickyBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Scroll the frame: the bar sticks to the bottom without covering the last row. */
export const OverAList: Story = {
  render: (args) => (
    <div style={{ height: '18rem', overflowY: 'auto', padding: '0 1rem' }}>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {Array.from({ length: 12 }, (_, index) => `q${index + 1}`).map((id, index) => (
          <p key={id} style={{ margin: 0, padding: '0.75rem 0' }}>
            Otázka {index + 1}
          </p>
        ))}
      </div>
      <StickyBar {...args} />
    </div>
  ),
};

export const Flat: Story = {
  args: { variant: 'flat' },
};

/**
 * Two actions, as `calculator-intro.tsx` uses it. No panel wraps the pair —
 * each floats on its own, the secondary one in `plate` (not `ghost`, which
 * has nothing behind it to read against now).
 */
export const TwoActions: Story = {
  args: {
    children: (
      <>
        <Button variant="plate" size="large">
          Začít znovu
        </Button>
        <Button size="large">Pokračovat v odpovídání</Button>
      </>
    ),
  },
};
