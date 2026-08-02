import type { Meta, StoryObj } from '@storybook/react-vite';
import { Backdrop } from './backdrop';

/**
 * The soft animated wash behind the question flow. Colours come from the
 * active theme's page/agree/disagree tokens — switch the Theme toolbar to see
 * it re-colour rather than staying pinned to one brand's palette.
 */
const meta = {
  title: 'Foundations/Backdrop',
  component: Backdrop,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', height: '70vh', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Backdrop>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Follows the active theme's own `backdrop` token — off unless the theme opts in. */
export const FollowsTheme: Story = {};

/** Forced on regardless of theme, for reviewing the shader itself. */
export const ForcedOn: Story = {
  args: { forceEnabled: true },
};
