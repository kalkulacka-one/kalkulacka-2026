import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from './analytics';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('trackEvent', () => {
  it('does nothing when there is no window at all — the plain node test environment', () => {
    // No stub: `window` is genuinely undefined here, same as any code path
    // that somehow calls this on the server.
    expect(() => trackEvent('Calculator started')).not.toThrow();
  });

  it('does nothing when the script never installed window.plausible', () => {
    const plausible = undefined;
    vi.stubGlobal('window', { plausible });
    expect(() => trackEvent('Calculator started')).not.toThrow();
  });

  it('forwards the event name with no props when none are given', () => {
    const plausible = vi.fn();
    vi.stubGlobal('window', { plausible });
    trackEvent('Calculator started');
    expect(plausible).toHaveBeenCalledWith('Calculator started', undefined);
  });

  it('wraps props under the `props` key the tagged-events script expects', () => {
    const plausible = vi.fn();
    vi.stubGlobal('window', { plausible });
    trackEvent('Result shared', { method: 'link' });
    expect(plausible).toHaveBeenCalledWith('Result shared', { props: { method: 'link' } });
  });
});
