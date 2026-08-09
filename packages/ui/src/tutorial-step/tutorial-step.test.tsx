import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TutorialStep } from './tutorial-step';

const base = {
  icon: 'arrowLeft',
  title: 'Souhlasím',
  description: 'Táhněte kartu doleva.',
} as const;

describe('TutorialStep', () => {
  it('shows what it teaches, and says nothing about progress', () => {
    const { container } = render(
      <ul>
        <TutorialStep {...base} />
      </ul>,
    );

    expect(screen.getByText('Souhlasím')).toBeInTheDocument();
    expect(screen.getByText('Táhněte kartu doleva.')).toBeInTheDocument();
    // One icon: the gesture. No tick — the list is reference, not a checklist.
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });
});
