import type { Meta, StoryObj } from '@storybook/react-vite';
import { AvatarStack } from './avatar-stack';

const PARTIES = [
  'ANO 2011',
  'Piráti a Starostové',
  'ODS',
  'Společně pro Pardubice',
  'SPD',
  'KDU-ČSL',
  'TOP 09',
  'Zelení',
  'ČSSD',
  'Svobodní',
  'Volba pro město',
  'Nezávislí',
].map((name, index) => ({ id: `p${index}`, name }));

const meta = {
  title: 'Results/AvatarStack',
  component: AvatarStack,
  parameters: { layout: 'padded' },
  args: {
    items: PARTIES.slice(0, 5),
    label: 'Strany, které s vámi souhlasí',
  },
} satisfies Meta<typeof AvatarStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Few: Story = {};

/** One over the limit keeps its face — a "+1" disc costs the same room and says less. */
export const AtTheLimit: Story = {
  args: { items: PARTIES.slice(0, 9) },
};

export const Overflowing: Story = {
  args: { items: PARTIES },
};

export const Medium: Story = {
  args: { items: PARTIES.slice(0, 6), size: 'medium' },
};

/** Nobody took your side — the stack renders nothing rather than an empty rail. */
export const Empty: Story = {
  args: { items: [] },
};
