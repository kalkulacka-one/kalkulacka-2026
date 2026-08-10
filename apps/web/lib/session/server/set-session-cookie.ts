import { cookies } from 'next/headers';
import { z } from 'zod';
import { buildCookieName } from '../shared';

export const sessionCookieSchema = z.object({
  id: z.uuid(),
  calculators: z.array(z.string()),
  createdAt: z.string().optional(),
});

export type SessionCookie = z.infer<typeof sessionCookieSchema>;

/**
 * Attributes shared by every write to the session cookie — including the
 * expiring overwrite in `getSessionCookie`: a deletion only lands if its
 * path/SameSite/Partitioned attributes match the cookie being deleted.
 */
export function sessionCookieOptions(embedName?: string | null) {
  const isEmbed = !!embedName;
  return {
    path: '/',
    httpOnly: true,
    secure: isEmbed || process.env.NODE_ENV === 'production',
    sameSite: isEmbed ? ('none' as const) : ('lax' as const),
    partitioned: isEmbed ? true : undefined,
  };
}

export async function setSessionCookie({
  sessionCookie,
  embedName,
}: {
  sessionCookie: SessionCookie;
  embedName?: string | null;
}): Promise<void> {
  const cookieName = buildCookieName({ embedName });

  const cookieStore = await cookies();
  cookieStore.set(cookieName, JSON.stringify(sessionCookie), {
    ...sessionCookieOptions(embedName),
    maxAge: 90 * 24 * 60 * 60, // 90 days
  });
}
