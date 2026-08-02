import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './icon';
import { type IconName, icons } from './icons';

const meta = {
  title: 'Primitives/Icon',
  component: Icon,
  args: { name: 'check' },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {(Object.keys(icons) as IconName[]).map((name) => (
        <figure
          key={name}
          style={{ display: 'grid', gap: '0.5rem', justifyItems: 'center', margin: 0 }}
        >
          <Icon name={name} size={24} />
          <figcaption style={{ font: '0.75rem var(--vk-typeface-sans)' }}>{name}</figcaption>
        </figure>
      ))}
    </div>
  ),
};

/**
 * The thin set at the sizes it actually ships at. If a new icon holds together
 * at 16 it is drawn correctly; if it muddies, its terminals are off the grid.
 */
export const ThinSetSizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {[16, 20, 28].map((size) => (
        <div key={size} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {(
            [
              'arrowLeft',
              'arrowRight',
              'checkThin',
              'crossThin',
              'starThin',
              'info',
              'share',
              'results',
            ] as IconName[]
          ).map((name) => (
            <Icon key={name} name={name} size={size} />
          ))}
        </div>
      ))}
    </div>
  ),
};

/** The star fills when a question is marked "pro mě důležité". */
export const StarStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <Icon name="star" size={28} />
      <Icon name="star" size={28} filled />
    </div>
  ),
};
