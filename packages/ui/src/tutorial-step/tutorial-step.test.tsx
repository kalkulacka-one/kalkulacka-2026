import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TutorialStep } from './tutorial-step';

const base = {
  icon: 'arrowLeft',
  title: 'Souhlasím',
  description: 'Táhněte kartu doleva.',
} as const;

describe('TutorialStep', () => {
  it('says nothing about completion when there is nothing to practise on', () => {
    render(
      <ul>
        <TutorialStep {...base} />
      </ul>,
    );

    expect(screen.queryByText('Vyzkoušeno')).not.toBeInTheDocument();
  });

  it('announces the tick, which is otherwise purely visual', () => {
    render(
      <ul>
        <TutorialStep {...base} done doneLabel="Vyzkoušeno" />
      </ul>,
    );

    expect(screen.getByText('Vyzkoušeno')).toBeInTheDocument();
  });

  it('keeps its own icon once done, so completed steps stay distinguishable', () => {
    const { container } = render(
      <ul>
        <TutorialStep {...base} done doneLabel="Vyzkoušeno" />
      </ul>,
    );

    // Two icons: the gesture the step teaches, plus the tick applied to it.
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });
});
