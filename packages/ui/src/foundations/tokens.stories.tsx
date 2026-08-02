import type { Meta, StoryObj } from '@storybook/react-vite';
import styles from './tokens.module.css';

/**
 * The token reference — and the design system's regression test.
 *
 * Switch the Theme toolbar to "Midnight" and every swatch, radius and type
 * sample below should change. Anything that does not move has a hardcoded value
 * somewhere it should not.
 */
const meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const BRAND = ['agree', 'disagree', 'neutral'];
const BRAND_VARIANTS = ['', '-soft', '-hover', '-active', '-on'];
const SURFACES = ['page', 'surface', 'surface-sunken', 'border', 'text', 'text-muted'];
const FLUID = [
  'gutter',
  'question-size',
  'gist-size',
  'chip-size',
  'card-pad-top',
  'card-pad-side',
  'star-size',
  'action-height',
  'action-radius',
  'nav-height',
];

function Swatch({ token }: { token: string }) {
  return (
    <div className={styles.swatch}>
      <div className={styles.chipColor} style={{ background: `var(--vk-color-${token})` }} />
      <code className={styles.code}>--vk-color-{token}</code>
    </div>
  );
}

export const Colors: Story = {
  render: () => (
    <div className={styles.stack}>
      {BRAND.map((brand) => (
        <section key={brand}>
          <h3 className={styles.heading}>{brand}</h3>
          <div className={styles.grid}>
            {BRAND_VARIANTS.map((variant) => (
              <Swatch key={variant} token={`${brand}${variant}`} />
            ))}
          </div>
        </section>
      ))}
      <section>
        <h3 className={styles.heading}>surfaces &amp; ink</h3>
        <div className={styles.grid}>
          {SURFACES.map((token) => (
            <Swatch key={token} token={token} />
          ))}
        </div>
      </section>
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className={styles.stack}>
      <div>
        <code className={styles.code}>--vk-typeface-question</code>
        <p className={styles.question}>
          Město by mělo kvůli rostoucím cenám energie omezit veřejné slavnostní osvětlení v době
          Vánoc.
        </p>
      </div>
      <div>
        <code className={styles.code}>--vk-typeface-sans</code>
        <p className={styles.gist}>
          K podobnému kroku přistoupila například rakouská Vídeň. Na hlavním bulváru Ring kolem
          centra nebude vánoční osvětlení vůbec.
        </p>
      </div>
    </div>
  ),
};

/**
 * The fluid scale replaces the prototype's JavaScript resize interpolation.
 * Resize the preview pane and these track continuously — with no re-render.
 */
export const FluidScale: Story = {
  render: () => (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>token</th>
          <th>current value</th>
        </tr>
      </thead>
      <tbody>
        {FLUID.map((token) => (
          <tr key={token}>
            <td>
              <code className={styles.code}>--vk-fluid-{token}</code>
            </td>
            <td>
              <span className={styles.ruler} style={{ width: `var(--vk-fluid-${token})` }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

export const Elevation: Story = {
  render: () => (
    <div className={styles.row}>
      {['card', 'card-next', 'card-back', 'card-lifted'].map((token) => (
        <div
          key={token}
          className={styles.elevation}
          style={{ boxShadow: `var(--vk-shadow-${token})` }}
        >
          <code className={styles.code}>{token}</code>
        </div>
      ))}
    </div>
  ),
};
