import type { Decorator, Preview } from '@storybook/react-vite';
import { themes } from '@vk/tokens';
import { useEffect } from 'react';

import '@vk/tokens/base.css';
import '@vk/tokens/themes/default.css';
import '@vk/tokens/themes/midnight.css';
import './preview.css';

/**
 * Applies the selected theme and colour mode to the preview document.
 *
 * This is the design system's regression test: switch Theme to something that
 * shares no colours with the default, or flip Mode to dark, and look for
 * anything that does not move. Whatever stays put has a hardcoded value in a
 * component.
 *
 * "System" leaves `data-mode` unset — Storybook itself doesn't emulate
 * `prefers-color-scheme` on demand, but the app's own dev/preview browser
 * does, so unset is the honest "whatever the OS says" state.
 */
const withTheme: Decorator = (Story, context) => {
  const theme = String(context.globals.theme ?? 'default');
  const mode = String(context.globals.mode ?? 'system');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    if (mode === 'system') delete document.documentElement.dataset.mode;
    else document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: {
    theme: 'default',
    mode: 'system',
  },
  globalTypes: {
    theme: {
      description: 'Design system theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: themes.map((t) => ({ value: t.name, title: t.label ?? t.name })),
      },
    },
    mode: {
      description: 'Colour mode (light/dark), where the active theme supports it',
      toolbar: {
        title: 'Mode',
        icon: 'circlehollow',
        dynamicTitle: true,
        items: [
          { value: 'system', title: 'System' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
};

export default preview;
