import { cookies } from 'next/headers';
import { parseWithSchema } from '@/lib/api/parse-with-schema';
import { buildCookieName } from '../shared';
import { sessionCookieOptions, sessionCookieSchema } from './set-session-cookie';

export async function getSessionCookie({ embedName }: { embedName?: string | null } = {}) {
  const cookieName = buildCookieName({ embedName });

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(cookieName);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const data = JSON.parse(sessionCookie.value);
    return parseWithSchema({ data, schema: sessionCookieSchema });
  } catch {
    // A garbage cookie used to throw here, which 500'd every session route for
    // this visitor until the cookie expired — 90 days. Treat it as "no
    // session" and expire it so the next request starts clean. (Only route
    // handlers call this, so writing cookies is allowed.)
    cookieStore.set(cookieName, '', { ...sessionCookieOptions(embedName), maxAge: 0 });
    return null;
  }
}
