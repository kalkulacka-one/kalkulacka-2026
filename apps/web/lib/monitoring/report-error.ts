import { appsignal } from './appsignal';

/**
 * The one seam every client-side error goes through.
 *
 * Always logs to the console — a client error boundary is the one place that
 * never reaches a server log on its own, so that has to happen regardless of
 * whether monitoring is configured. Forwarding to AppSignal is additional,
 * not a replacement: `appsignal` is `null` on any deployment without
 * `NEXT_PUBLIC_APPSIGNAL_FRONTEND_KEY`, which keeps this call safe to sprinkle
 * anywhere without checking first.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(err, context);
  appsignal?.sendError(err, context);
}
