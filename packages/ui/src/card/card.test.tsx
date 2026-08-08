import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('renders as a div by default', () => {
    render(<Card>Obsah</Card>);
    const card = screen.getByText('Obsah');
    expect(card.tagName).toBe('DIV');
  });

  it('renders as the given element via `as`', () => {
    render(
      <Card as="button" onClick={() => {}}>
        Vyberte
      </Card>,
    );
    expect(screen.getByRole('button', { name: 'Vyberte' })).toBeInTheDocument();
  });

  it('passes through extra props like data attributes', () => {
    render(<Card data-testid="stack-card">Obsah</Card>);
    expect(screen.getByTestId('stack-card')).toBeInTheDocument();
  });
});
