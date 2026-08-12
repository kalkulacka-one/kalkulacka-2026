import type { Meta, StoryObj } from '@storybook/react-vite';
import { VisuallyHidden } from './visually-hidden';

/**
 * Renders normally in the canvas — Storybook can't demonstrate "invisible but
 * announced" visually, so this story exists mainly so the component appears
 * in the sidebar and its props are documented. Inspect with a screen reader
 * or the accessibility tree to see it read while staying off-screen.
 */
const meta = {
  title: 'Primitives/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: 'Announced to screen readers, invisible on screen' },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Use `output`/`div` with `aria-live` for a status that changes without moving focus. */
export const LiveRegion: Story = {
  args: {
    as: 'output',
    'aria-live': 'polite',
    children: 'Odpověď zaznamenána: Ano',
  },
};
