import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterChips, type FilterOption } from './filter-chips';

const options: FilterOption[] = [
  { id: 'all', label: 'Vše', count: 42 },
  { id: 'agree', label: 'Shody', count: 12 },
  { id: 'important', label: 'Důležité', count: 7, separatorBefore: true },
];

describe('FilterChips', () => {
  it('marks exactly the active option as pressed', () => {
    render(<FilterChips label="Filtr" options={options} value="agree" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Vše/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Shody/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with the clicked option id', async () => {
    const onChange = vi.fn();
    render(<FilterChips label="Filtr" options={options} value="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Důležité/ }));
    expect(onChange).toHaveBeenCalledWith('important');
  });

  it('names the group for assistive tech via a visually hidden legend', () => {
    render(
      <FilterChips label="Filtrovat otázky" options={options} value="all" onChange={() => {}} />,
    );
    expect(screen.getByRole('group', { name: 'Filtrovat otázky' })).toBeInTheDocument();
  });

  it('shows the count next to each label when provided', () => {
    render(<FilterChips label="Filtr" options={options} value="all" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Vše.*42/ })).toBeInTheDocument();
  });
});
