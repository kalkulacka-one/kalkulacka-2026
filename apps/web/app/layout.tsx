import { Backdrop } from '@vk/ui';
import type { Metadata, Viewport } from 'next';
import { Geist, Radio_Canada } from 'next/font/google';
import type { ReactNode } from 'react';
import { bootstrapColorMode } from '../lib/color-mode';

import '@vk/tokens/base.css';
import '@vk/tokens/themes/default.css';
import '@vk/tokens/themes/midnight.css';
import './globals.css';

// Font *loading* is an app concern; themes only reference the resulting
// variables. That keeps @vk/tokens free of any bundler-specific font plumbing.
// `latin-ext` is required — without it Czech diacritics (ř ě č ů) fall back.
const display = Radio_Canada({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--vk-font-display',
  display: 'swap',
});

const sans = Geist({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--vk-font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Volební kalkulačka',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The theme is chosen server-side, so the correct brand is in the first byte
  // of HTML — no flash of the default theme before hydration.
  return (
    <html
      lang="cs"
      data-theme="default"
      className={`${display.variable} ${sans.variable}`}
      // The inline script below adds `data-mode` itself, before hydration —
      // deliberately out of step with the server-rendered markup, which
      // knows nothing about a client-only localStorage value. That mismatch
      // is the point, not a bug for React to flag.
      suppressHydrationWarning
    >
      <body>
        {/*
          Light/dark mode defaults to the OS preference (`color-scheme: light
          dark` in base.css); this only has work to do once someone picks an
          explicit override. A plain `<script>` — not `next/script` — because
          it has to run synchronously while the server-rendered HTML is still
          being parsed, before the browser paints anything: that's what stops
          a stored override from flashing the system mode first.
        */}
        <script id="color-mode-bootstrap" suppressHydrationWarning>
          {bootstrapColorMode}
        </script>

        {/*
          The backdrop lives here, not in `AppShell`, precisely because this
          element survives navigation. Rendered per screen it was remounted on
          every route change, which restarted the shader's clock — so moving
          from the last question to the recap made the whole wash jump to a
          different frame. One instance under the root layout drifts on
          undisturbed while the screens above it change.
        */}
        <div className="backdropLayer">
          <Backdrop />
        </div>

        {children}
      </body>
    </html>
  );
}
