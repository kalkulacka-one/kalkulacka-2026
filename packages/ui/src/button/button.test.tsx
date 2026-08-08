import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('defaults to type="button" so it never submits a surrounding form by accident', () => {
    render(<Button>Souhlasím</Button>);
    expect(screen.getByRole('button', { name: 'Souhlasím' })).toHaveAttribute('type', 'button');
  });

  it('renders as the given element and drops the button-only type attribute', () => {
    render(
      <Button as="a" href="/otazka/1">
        Pokračovat
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Pokračovat' });
    expect(link).toHaveAttribute('href', '/otazka/1');
    expect(link).not.toHaveAttribute('type');
  });

  it('fires its click handler', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Další</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Další' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders start and end icons around the label', () => {
    render(
      <Button iconStart="check" iconEnd="chevronRight">
        Souhlasím
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Souhlasím' });
    expect(button.querySelectorAll('svg')).toHaveLength(2);
  });
});
