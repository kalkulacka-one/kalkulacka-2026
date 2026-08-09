'use client';

import { type CalculatorSyncTarget, useCalculatorSync } from '../lib/session-sync';

/**
 * Renders nothing; opens the anonymous session for whichever calculator screen
 * is on the page.
 *
 * A component rather than a hook inside each screen because the screens are
 * five and the lifecycle is one — and because the *page* is what knows a
 * calculator has been entered at all. Nothing it does touches the markup, so
 * there is nothing here for hydration to disagree about.
 */
export function CalculatorSession(target: CalculatorSyncTarget) {
  useCalculatorSync(target);

  return null;
}
