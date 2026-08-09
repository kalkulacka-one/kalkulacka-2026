import messages from '@vk/i18n/messages/cs.json' with { type: 'json' };

export { messages };

/**
 * Fill `{name}` placeholders — a copy of `@vk/i18n`'s `format()`, not an
 * import of it: that function reads the app's own module graph (`.ts` source
 * under a workspace package), and this file is deliberately importing the
 * *catalog* on its own so a test asserts against the same strings the app
 * renders without asserting against the app's formatting code too.
 */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
