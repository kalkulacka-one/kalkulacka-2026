import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';

/**
 * jsdom (v30) doesn't implement `<dialog>`'s `showModal()`/`close()` at all —
 * verified directly: `typeof dialog.showModal === 'undefined'`. This is the
 * minimum stub needed to exercise Dialog's own logic against something that
 * behaves like a real browser: `showModal()` flips `open` true, `close()`
 * flips it false and fires the native `close` event.
 */
function installRealisticDialogStub() {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

beforeAll(() => {
  installRealisticDialogStub();
});

/** A stateful host, since Dialog treats `open` as a prop it only reflects, not owns. */
function Host({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Otevřít
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Jak to funguje" closeLabel="Zavřít">
        <p>Obsah</p>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('closes on Escape through React state, not by waiting on the native close event', () => {
    render(<Host initialOpen />);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveProperty('open', true);

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(dialog).toHaveProperty('open', false);
  });

  it('calls onClose on a backdrop click but not on a click inside the panel', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Jak to funguje" closeLabel="Zavřít">
        <p>Obsah</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { hidden: true });

    await userEvent.click(screen.getByText('Obsah'));
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(dialog);
    expect(onClose).toHaveBeenCalledOnce();
  });

  /*
   * The regression that motivated Dialog's own onKeyDown handling: a modal
   * `<dialog>` dismisses itself on Escape, but that path only reports back via
   * the `close` event. If that event never arrives — verified true of the
   * Claude Browser tool used to check this app, and simulated here — the
   * element shuts while `open` still says true, and the same dialog can never
   * be told to open again. This block runs with a `close()` that flips `.open`
   * but never fires the event, so these tests fail if Escape is ever rerouted
   * back through the native event alone instead of calling `onClose` directly.
   */
  describe('when the native close event never fires', () => {
    beforeEach(() => {
      HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
        this.open = false;
      };
    });

    afterEach(() => {
      installRealisticDialogStub();
    });

    it('still closes on Escape', () => {
      render(<Host initialOpen />);
      const dialog = screen.getByRole('dialog', { hidden: true });

      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(dialog).toHaveProperty('open', false);
    });

    it('reopens after an Escape dismissal', async () => {
      render(<Host initialOpen />);
      const dialog = screen.getByRole('dialog', { hidden: true });

      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(dialog).toHaveProperty('open', false);

      await userEvent.click(screen.getByRole('button', { name: 'Otevřít' }));

      expect(dialog).toHaveProperty('open', true);
    });
  });
});
