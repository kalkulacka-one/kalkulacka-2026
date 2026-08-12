'use client';

import { getMessages } from '@vk/i18n';
import { Button, Dialog, Menu, type MenuItem } from '@vk/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAnswersStore } from '../lib/answers-store';
import { useColorMode } from '../lib/color-mode';
import { type CalculatorRef, questionPath } from '../lib/paths';
import { HelpDialog } from './help-dialog';
import { RestartDialog } from './restart-dialog';

export type AppMenuProps = {
  /**
   * Absent on screens that are not inside a calculator (the district picker,
   * the homepage) — there is nothing there to restart or leave, so those two
   * items simply do not appear rather than appearing dead.
   */
  calculator?: { id: string } & CalculatorRef;
  /**
   * Inside a partner iframe. "Opustit kalkulačku" disappears: it navigates to
   * the homepage, and doing that *inside the iframe* strands the visitor in a
   * frame of the wrong site — the way out of an embed is the attribution link
   * in the header, which opens a new tab. Help and restart stay.
   */
  embed?: boolean;
  /**
   * False when the active theme is single-mode (partner brand themes are) —
   * the toggle would visibly do nothing there. See `AppShell`, which is where
   * this is decided.
   */
  colorModeToggle?: boolean;
};

const messages = getMessages();

/** Which dialog, if any, is up. Only one can be, so this is a mode, not flags. */
type OpenDialog = 'none' | 'help' | 'restart' | 'leave';

/**
 * The menu in the corner of every screen.
 *
 * Restarting is the one genuinely destructive thing in the app, so it is the
 * one thing here that asks first. Leaving asks too, but for the opposite
 * reason: the answer is reassuring, and the moment someone worries about
 * losing their progress is exactly the moment to tell them it is saved.
 */
export function AppMenu({ calculator, embed = false, colorModeToggle = true }: AppMenuProps) {
  const router = useRouter();
  const resetCalculator = useAnswersStore((s) => s.resetCalculator);
  const [dialog, setDialog] = useState<OpenDialog>('none');
  const [colorMode, toggleColorMode] = useColorMode();

  const close = () => setDialog('none');

  const items: MenuItem[] = [
    {
      id: 'help',
      label: messages.menu.help,
      detail: messages.menu.helpDetail,
      icon: 'info',
      onSelect: () => setDialog('help'),
    },
    // Labelled by what it switches *to*, matching every other item's
    // imperative phrasing — so the icon and label always describe the mode
    // one click away, not the one currently showing.
    ...(colorModeToggle
      ? [
          colorMode === 'dark'
            ? {
                id: 'color-mode',
                label: messages.menu.lightMode,
                detail: messages.menu.lightModeDetail,
                icon: 'sun' as const,
                onSelect: toggleColorMode,
              }
            : {
                id: 'color-mode',
                label: messages.menu.darkMode,
                detail: messages.menu.darkModeDetail,
                icon: 'moon' as const,
                onSelect: toggleColorMode,
              },
        ]
      : []),
    ...(calculator
      ? ([
          {
            id: 'restart',
            label: messages.menu.restart,
            detail: messages.menu.restartDetail,
            icon: 'restart',
            onSelect: () => setDialog('restart'),
          },
          ...(embed
            ? []
            : ([
                {
                  id: 'leave',
                  label: messages.menu.leave,
                  detail: messages.menu.leaveDetail,
                  icon: 'exit',
                  onSelect: () => setDialog('leave'),
                },
              ] satisfies MenuItem[])),
        ] satisfies MenuItem[])
      : []),
  ];

  const handleRestart = () => {
    if (!calculator) return;
    resetCalculator(calculator.id);
    close();
    router.push(questionPath(calculator, 1));
  };

  return (
    <>
      <Menu label={messages.menu.label} items={items} />

      <HelpDialog open={dialog === 'help'} onClose={close} />

      <RestartDialog open={dialog === 'restart'} onClose={close} onConfirm={handleRestart} />

      <Dialog
        open={dialog === 'leave'}
        onClose={close}
        title={messages.menu.leaveTitle}
        description={messages.menu.leaveDescription}
        closeLabel={messages.menu.close}
        actions={
          <>
            <Button variant="ghost" onClick={close}>
              {messages.menu.cancel}
            </Button>
            <Button
              onClick={() => {
                close();
                // The homepage is Phase 8, so this currently lands on the
                // "Připravujeme" placeholder — the exit is real, the
                // destination is the part that is still being built.
                router.push('/');
              }}
            >
              {messages.menu.leaveConfirm}
            </Button>
          </>
        }
      />
    </>
  );
}
