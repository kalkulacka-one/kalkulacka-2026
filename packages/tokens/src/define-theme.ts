import { type Theme, type ThemeInput, themeInputSchema } from './contract';

/**
 * Validate and normalise a theme.
 *
 * Typos and bad values fail here with a readable message rather than silently
 * producing a CSS variable nobody reads — which matters because the people
 * writing these files are often not full-time frontend developers.
 */
export function defineTheme(input: ThemeInput): Theme {
  const result = themeInputSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid theme "${input.name ?? '(unnamed)'}":\n${issues}`);
  }

  return result.data;
}
