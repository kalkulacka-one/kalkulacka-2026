import { activeLocale, getMessages } from '@vk/i18n';
import { Backdrop } from '@vk/ui';
import type { Metadata, Viewport } from 'next';
import { Geist, Radio_Canada } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { MonitoringBoot } from '../components/monitoring-boot';
import { bootstrapColorMode } from '../lib/color-mode';
import { bootstrapEmbedTheme } from '../lib/embed-theme-bootstrap';

import '@vk/tokens/base.css';
import '@vk/tokens/themes/default.css';
import '@vk/tokens/themes/midnight.css';
import '@vk/tokens/themes/diky-ze-muzem.css';
import '@vk/tokens/themes/alarm.css';
import '@vk/tokens/themes/prima.css';
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

const messages = getMessages();

export const metadata: Metadata = {
  // `default` is what an untitled segment (the home route) gets, verbatim —
  // `template` only wraps a *set* title, so it never doubles up with itself
  // there. Every other route's `generateMetadata` sets a plain title string
  // and lands inside the template.
  title: {
    default: messages.app.title,
    template: `%s · ${messages.app.title}`,
  },
  description: messages.app.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /*
   * One tag, no `prefers-color-scheme` pair.
   *
   * A media-gated pair follows the *OS*, which stops being the right answer
   * the moment someone picks a mode in the app's menu — and a browser applies
   * the first tag whose media matches, so the OS's answer would keep winning
   * over anything written later. A single unconditional tag is the one
   * `color-mode.ts` can own: the bootstrap script corrects it before first
   * paint and the toggle rewrites it on every switch. This value is only what
   * a browser sees in the served HTML, i.e. the light page colour.
   */
  themeColor: '#f8fafc',
};

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: ReactNode }) {
  // The theme is chosen server-side, so the correct brand is in the first byte
  // of HTML — no flash of the default theme before hydration.
  return (
    <html
      lang={activeLocale()}
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
        <script
          id="color-mode-bootstrap"
          suppressHydrationWarning
          // A child string triggers React's "script tag while rendering"
          // dev warning, since a `<script>` child is normally page text, not
          // code — `dangerouslySetInnerHTML` is the same output without it.
          // biome-ignore lint/security/noDangerouslySetInnerHtml: `bootstrapColorMode` is a fixed, module-scope string with no user input, not markup built from a request.
          dangerouslySetInnerHTML={{ __html: bootstrapColorMode }}
        />

        {/*
          Partner embeds get their brand theme before first paint, for the
          same reason and by the same mechanism as the color-mode script
          above — an effect-based switch flashes the default theme inside a
          partner's page. The map inside is baked from `config/embeds.ts` at
          build time; see `lib/embed-theme-bootstrap.ts`.
        */}
        <script
          id="embed-theme-bootstrap"
          suppressHydrationWarning
          // biome-ignore lint/security/noDangerouslySetInnerHtml: `bootstrapEmbedTheme` is a fixed, module-scope string with no user input, not markup built from a request.
          dangerouslySetInnerHTML={{ __html: bootstrapEmbedTheme }}
        />

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

        {/*
          Plausible is cookieless: no identifier is written to the visitor's
          device, so there is nothing here for a consent banner to gate — that's
          the same posture production ships. Absent entirely without
          `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`: no script tag, no request, on a fork
          that hasn't configured an analytics domain. `src` is the first-party
          path rewritten to plausible.io in `next.config.ts`, not the vendor's
          own domain, so an adblocker measuring third-party requests doesn't
          drop it.
        */}
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src="/js/script.tagged-events.outbound-links.js"
          />
        ) : null}

        <MonitoringBoot />

        {children}
      </body>
    </html>
  );
}
