import type { Metadata } from 'next';
import { Geist, Radio_Canada } from 'next/font/google';
import type { ReactNode } from 'react';

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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The theme is chosen server-side, so the correct brand is in the first byte
  // of HTML — no flash of the default theme before hydration.
  return (
    <html lang="cs" data-theme="default" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
