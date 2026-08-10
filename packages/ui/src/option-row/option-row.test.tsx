import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OptionRow } from './option-row';

describe('OptionRow', () => {
  it('renders as a link when enabled, still reaching the given href', () => {
    render(<OptionRow label="Pardubice" href="/volby/komunalni-2022/pardubice/intro" />);
    expect(screen.getByRole('link', { name: /Pardubice/ })).toHaveAttribute(
      'href',
      '/volby/komunalni-2022/pardubice/intro',
    );
  });

  it('drops to a non-interactive element when disabled, dropping the href with it', () => {
    render(<OptionRow label="Praha hl. m." href="/somewhere" disabled />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Praha hl. m.')).toBeInTheDocument();
  });

  it('marks the highlighted row without disabling or unlinking it', () => {
    render(<OptionRow label="Ostrava" href="/somewhere" highlighted />);
    const link = screen.getByRole('link', { name: /Ostrava/ });
    expect(link).toHaveAttribute('href', '/somewhere');
    expect(link.className).toMatch(/highlighted/);
  });

  it('forwards tabIndex, for a row that lives in a roving-tabindex list', () => {
    render(<OptionRow label="Liberec" href="/somewhere" tabIndex={-1} />);
    expect(screen.getByRole('link', { name: /Liberec/ })).toHaveAttribute('tabindex', '-1');
  });

  it('leaves tabIndex off a plain row, so it just takes the browser default', () => {
    render(<OptionRow label="Zlín" href="/somewhere" />);
    expect(screen.getByRole('link', { name: /Zlín/ })).not.toHaveAttribute('tabindex');
  });

  it('never puts a disabled row in the tab order, even if a roving list passed it a tabIndex', () => {
    render(<OptionRow label="Praha hl. m." href="/somewhere" disabled tabIndex={0} />);
    expect(screen.getByText('Praha hl. m.')).not.toHaveAttribute('tabindex');
  });
});
