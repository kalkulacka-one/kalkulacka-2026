import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OptionRow } from './option-row';
import { OptionRowList, type OptionRowListHandle } from './option-row-list';

/**
 * A stand-in for `DistrictPicker`'s own wiring: `OptionRowList` is a
 * controlled component (like `SearchField`'s `value`), so exercising it
 * realistically means owning `activeIndex` state the way a real caller
 * would, not just rendering it once.
 */
function Harness({
  labels,
  disabled = [],
  onActivate,
}: {
  labels: string[];
  disabled?: string[];
  onActivate?: (label: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const handleRef = useRef<OptionRowListHandle>(null);

  return (
    <>
      {/* A real tab stop before the list, the way the search field is. */}
      <button type="button">before</button>

      <OptionRowList ref={handleRef} activeIndex={activeIndex} onActiveIndexChange={setActiveIndex}>
        {/*
         * `tabIndex` is the caller's own job, same as in `DistrictPicker` —
         * `OptionRowList` reads `activeIndex` to move focus and scroll, but
         * never reaches into its children to set their props itself.
         */}
        {labels.map((label, index) => (
          <li key={label}>
            <OptionRow
              label={label}
              href={`/${label}`}
              disabled={disabled.includes(label)}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => onActivate?.(label)}
            />
          </li>
        ))}
      </OptionRowList>

      <button type="button">after</button>
      <button type="button" onClick={() => handleRef.current?.focusFirst()}>
        jump in from outside
      </button>
    </>
  );
}

function links() {
  return screen.getAllByRole('link');
}

/** `rows[i]` narrowed past `noUncheckedIndexedAccess` — a missing row is a broken test, not a case to branch on. */
function nth(rows: HTMLElement[], index: number): HTMLElement {
  const row = rows[index];
  if (!row) throw new Error(`expected a row at index ${index}, only got ${rows.length}`);
  return row;
}

describe('OptionRowList', () => {
  it('starts with exactly one row in the tab order — the active one', () => {
    render(<Harness labels={['Brno', 'Pardubice', 'Plzeň']} />);
    const rows = links();

    expect(nth(rows, 0)).toHaveAttribute('tabindex', '0');
    expect(nth(rows, 1)).toHaveAttribute('tabindex', '-1');
    expect(nth(rows, 2)).toHaveAttribute('tabindex', '-1');
  });

  it('walks ArrowDown/ArrowUp through the rows, moving real focus and the roving slot together', async () => {
    const user = userEvent.setup();
    render(<Harness labels={['Brno', 'Pardubice', 'Plzeň']} />);
    const rows = links();

    nth(rows, 0).focus();
    await user.keyboard('{ArrowDown}');
    expect(nth(rows, 1)).toHaveFocus();
    expect(nth(rows, 1)).toHaveAttribute('tabindex', '0');
    expect(nth(rows, 0)).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{ArrowDown}');
    expect(nth(rows, 2)).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(nth(rows, 1)).toHaveFocus();
  });

  /*
   * The APG's own listbox pattern defaults to no wrap, and stopping reads
   * right here specifically: a search field sits above this list, so
   * looping from the last row to the first would be a shorter trip than
   * Shift+Tab back to where the user was typing — not the trip ArrowDown at
   * the bottom row should take.
   */
  it('stops at the ends rather than wrapping', async () => {
    const user = userEvent.setup();
    render(<Harness labels={['Brno', 'Pardubice']} />);
    const rows = links();

    nth(rows, 0).focus();
    await user.keyboard('{ArrowUp}');
    expect(nth(rows, 0)).toHaveFocus();

    nth(rows, 1).focus();
    await user.keyboard('{ArrowDown}');
    expect(nth(rows, 1)).toHaveFocus();
  });

  it('Home and End jump to the first and last row', async () => {
    const user = userEvent.setup();
    render(<Harness labels={['Brno', 'Pardubice', 'Plzeň', 'Ostrava']} />);
    const rows = links();

    nth(rows, 1).focus();
    await user.keyboard('{End}');
    expect(nth(rows, 3)).toHaveFocus();

    await user.keyboard('{Home}');
    expect(nth(rows, 0)).toHaveFocus();
  });

  it('only ever keeps one row in the tab order, however the active one changed', async () => {
    const user = userEvent.setup();
    render(<Harness labels={['Brno', 'Pardubice', 'Plzeň']} />);
    const rows = links();

    nth(rows, 0).focus();
    await user.keyboard('{End}');

    const tabbable = rows.filter((row) => row.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(nth(rows, 2));
  });

  it('skips a disabled row — it renders as a non-interactive div, not a link', async () => {
    const user = userEvent.setup();
    render(<Harness labels={['Brno', 'Pardubice', 'Plzeň']} disabled={['Pardubice']} />);

    // The disabled row never becomes a link in the first place.
    expect(screen.getByText('Pardubice').closest('a')).toBeNull();

    const rows = links();
    expect(rows).toHaveLength(2);

    nth(rows, 0).focus();
    await user.keyboard('{ArrowDown}');
    expect(nth(rows, 1)).toHaveFocus();
    expect(nth(rows, 1)).toHaveTextContent('Plzeň');
  });

  it('syncs the roving slot when a row is focused directly, e.g. by a click', async () => {
    const user = userEvent.setup();
    render(<Harness labels={['Brno', 'Pardubice', 'Plzeň']} />);
    const rows = links();

    await user.click(nth(rows, 2));
    expect(nth(rows, 2)).toHaveFocus();

    expect(nth(rows, 2)).toHaveAttribute('tabindex', '0');
    expect(nth(rows, 0)).toHaveAttribute('tabindex', '-1');
  });

  it('exposes focusFirst() for a search field to hand focus into the list', async () => {
    const user = userEvent.setup();
    render(<Harness labels={['Brno', 'Pardubice', 'Plzeň']} />);
    const rows = links();

    nth(rows, 2).focus();
    await user.click(screen.getByRole('button', { name: 'jump in from outside' }));

    expect(nth(rows, 0)).toHaveFocus();
  });

  it('exposes scrollActiveIntoView() that scrolls the active row without moving focus', () => {
    const scrollIntoView = vi.fn();
    // jsdom has no layout, so `scrollIntoView` doesn't exist on its elements
    // at all — every real browser does implement it, this just gives jsdom a
    // spy to assert against in its place.
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    function ImperativeHarness() {
      const handleRef = useRef<OptionRowListHandle>(null);
      return (
        <>
          <OptionRowList ref={handleRef} activeIndex={1} onActiveIndexChange={() => {}}>
            <li>
              <OptionRow label="Brno" href="/brno" />
            </li>
            <li>
              <OptionRow label="Pardubice" href="/pardubice" />
            </li>
          </OptionRowList>
          <button type="button" onClick={() => handleRef.current?.scrollActiveIntoView()}>
            scroll
          </button>
        </>
      );
    }

    render(<ImperativeHarness />);
    const before = document.activeElement;

    fireEvent.click(screen.getByRole('button', { name: 'scroll' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(scrollIntoView.mock.instances[0]).toBe(screen.getByRole('link', { name: 'Pardubice' }));
    // Scrolling is not focusing — the search field (or wherever focus was)
    // keeps it.
    expect(document.activeElement).toBe(before);
  });
});
