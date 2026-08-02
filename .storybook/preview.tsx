import type { Decorator, Preview } from '@storybook/react-vite';
import { themes } from '@vk/tokens';
import { useEffect } from 'react';

import '@vk/tokens/base.css';
import '@vk/tokens/themes/default.css';
import '@vk/tokens/themes/midnight.css';
import './preview.css';

/**
 * Applies the selected theme to the preview document.
 *
 * This is the design system's regression test: switch the toolbar to a theme
 * that shares no colours with the default and look for anything that does not
 * move. Whatever stays put has a hardcoded value in a component.
 */
const withTheme: Decorator = (Story, context) => {
  const theme = String(context.globals.theme ?? 'default');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: {
    theme: 'default',
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
  },
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
};

export default preview;
