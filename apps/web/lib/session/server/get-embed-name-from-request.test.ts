import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { getEmbedNameFromRequest } from './get-embed-name-from-request';

function requestWithReferer(referer?: string): NextRequest {
  return new NextRequest('http://localhost/api/sessions', {
    headers: referer ? { referer } : undefined,
  });
}

describe('getEmbedNameFromRequest', () => {
  it('reads the embed name from an /embed/:name path', () => {
    const request = requestWithReferer('https://www.volebnikalkulacka.cz/embed/idnes/kalkulacka');
    expect(getEmbedNameFromRequest(request)).toBe('idnes');
  });

  it('returns undefined with no referer header', () => {
    expect(getEmbedNameFromRequest(requestWithReferer())).toBeUndefined();
  });

  it('returns undefined when the referer has no /embed/ segment', () => {
    const request = requestWithReferer('https://www.volebnikalkulacka.cz/kalkulacka');
    expect(getEmbedNameFromRequest(request)).toBeUndefined();
  });

  it('returns undefined when /embed/ is the last segment', () => {
    const request = requestWithReferer('https://www.volebnikalkulacka.cz/embed');
    expect(getEmbedNameFromRequest(request)).toBeUndefined();
  });

  it('returns undefined for a malformed referer', () => {
    expect(getEmbedNameFromRequest(requestWithReferer('not-a-url'))).toBeUndefined();
  });
});
