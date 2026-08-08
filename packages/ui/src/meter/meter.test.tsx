import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meter } from './meter';

describe('Meter', () => {
  it('is decorative (aria-hidden) without a label', () => {
    const { container } = render(<Meter value={72} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('exposes itself as a meter with rounded aria-valuenow when labelled', () => {
    render(<Meter value={63.4} label="Shoda 63 %" />);
    const meter = screen.getByRole('meter', { name: 'Shoda 63 %' });
    expect(meter).toHaveAttribute('aria-valuenow', '63');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps values above 100', () => {
    const { container } = render(<Meter value={140} />);
    const fill = container.querySelector('[style]') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('clamps values below 0', () => {
    const { container } = render(<Meter value={-20} />);
    const fill = container.querySelector('[style]') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });
});
