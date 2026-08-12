import { defineTheme } from '../define-theme';

/**
 * Alarm — embed partner theme, re-authored from the previous platform's
 * `alarm.css` (neon green, hot red, black). Light-only on purpose — see
 * `diky-ze-muzem.theme.ts` for why partner themes are single-mode.
 *
 * Both accents keep their exact brand values because the ink threshold does
 * the right thing with them: the neon green (OKLCH L 0.86) and the hot red
 * (L 0.64) both sit *above* the 0.62 threshold, so filled controls get black
 * ink — black-on-neon, which is Alarm's actual look, at 14.6:1 and 5.4:1.
 *
 * `focus` is the one override the old theme never needed: it defaults to
 * `agree`, and the neon green reads at 1.34:1 against a white page — a focus
 * ring that vanishes. Black is the brand's third colour and unmissable.
 */
export const alarmTheme = defineTheme({
  name: 'alarm',
  label: 'Alarm',

  color: {
    light: {
      agree: '#75f261',
      disagree: '#ff1346',
      neutral: '#000000',

      focus: '#000000',
    },
  },
});
