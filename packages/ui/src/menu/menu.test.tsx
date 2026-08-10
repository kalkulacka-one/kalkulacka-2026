import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Menu } from './menu';

describe('Menu', () => {
  it('moves focus to the first item on open and back to the trigger on Escape', async () => {
    render(<Menu label="Menu" items={[{ id: 'help', label: 'Nápověda', onSelect: () => {} }]} />);

    const trigger = screen.getByRole('button', { name: 'Menu' });
    await userEvent.click(trigger);

    const item = screen.getByRole('menuitem', { name: 'Nápověda' });
    expect(item).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  /*
   * Selecting drops the item being clicked out of the DOM. Without the
   * restore, focus falls to `<body>` — and since most of these items open a
   * modal, `showModal()` then records `<body>` as the element to hand focus
   * back to, so dismissing the sheet stranded a keyboard user at the top of
   * the document instead of on the menu they opened it from.
   */
  it('restores focus to the trigger before running the selected action', async () => {
    const active: (Element | null)[] = [];
    const onSelect = vi.fn(() => active.push(document.activeElement));

    render(<Menu label="Menu" items={[{ id: 'mode', label: 'Světlý režim', onSelect }]} />);

    const trigger = screen.getByRole('button', { name: 'Menu' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Světlý režim' }));

    expect(onSelect).toHaveBeenCalledOnce();
    // Read at the moment the action ran, not after: an action that opens a
    // dialog takes focus off the trigger again straight away, and it is the
    // hand-off point that has to be right.
    expect(active[0]).toBe(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
