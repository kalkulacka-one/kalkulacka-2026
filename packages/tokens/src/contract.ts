import { z } from 'zod';

/**
 * What a theme author writes.
 *
 * Deliberately small: typefaces, roughly a dozen colours, and a few shape and
 * motion knobs. Everything else — hover/active/soft variants, borders, the
 * fluid type and spacing scale — is *derived* in `base.css`, so re-skinning the
 * app never means restating two hundred values.
 *
 * Every field below `name` is optional. Omit one and the default theme's value
 * is used, which means a partner theme can be four lines long.
 */
const cssColor = z.string().min(1);

export const themeInputSchema = z.object({
  /** Stable identifier. Becomes the `data-theme` attribute value. */
  name: z.string().regex(/^[a-z0-9-]+$/, 'Theme names are lowercase, digits and dashes only'),

  /** Human-readable label, shown in the Storybook theme switcher. */
  label: z.string().optional(),

  typeface: z
    .object({
      /** Brand/heading face. */
      display: z.string().optional(),
      /** Body face. */
      sans: z.string().optional(),
      /**
       * Face for question statements. Defaults to `display`.
       * Broken out because it is the one thing partners most often want to
       * change on its own.
       */
      question: z.string().optional(),
      mono: z.string().optional(),
    })
    .optional(),

  color: z
    .object({
      /** "Souhlasím" — drives the agree button, progress segment and soft border. */
      agree: cssColor.optional(),
      /** "Nesouhlasím". */
      disagree: cssColor.optional(),
      /** Neutral/dark accent: skipped answers, toast, the important toggle. */
      neutral: cssColor.optional(),

      /** Page background behind the cards. */
      page: cssColor.optional(),
      /** Card and control background. */
      surface: cssColor.optional(),
      /** Slightly recessed surface, e.g. the filled topic chip. */
      surfaceSunken: cssColor.optional(),

      text: cssColor.optional(),
      textMuted: cssColor.optional(),
      border: cssColor.optional(),

      /** Focus ring. Defaults to `agree`. */
      focus: cssColor.optional(),
    })
    .optional(),

  radius: z
    .object({
      /**
       * The question card. A full border-radius shorthand, because the design's
       * signature is an asymmetric card (square top-left, rounded elsewhere).
       */
      card: z.string().optional(),
      /** Answer buttons. */
      control: z.string().optional(),
      chip: z.string().optional(),
      /** Fully round things: pills, toasts, the important toggle. */
      pill: z.string().optional(),
    })
    .optional(),

  motion: z
    .object({
      durationFast: z.string().optional(),
      durationBase: z.string().optional(),
      durationSlow: z.string().optional(),
      /** Settle/spring-back curve. */
      easingSpring: z.string().optional(),
      /** Card fly-out curve. */
      easingExit: z.string().optional(),
    })
    .optional(),

  /**
   * Viewport anchors for the fluid scale. The prototype interpolates its
   * dimensions between a narrow and a wide layout; we express that as CSS
   * `clamp()` instead, so there is no resize listener and no re-render.
   */
  fluid: z
    .object({
      minViewport: z.number().positive().optional(),
      maxViewport: z.number().positive().optional(),
    })
    .optional(),

  /** Decorative page backdrop. */
  backdrop: z.enum(['none', 'gradient']).optional(),
});

export type ThemeInput = z.input<typeof themeInputSchema>;
export type Theme = z.output<typeof themeInputSchema>;
