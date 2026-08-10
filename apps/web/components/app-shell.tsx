import { getMessages } from '@vk/i18n';
import { themes } from '@vk/tokens';
import { AppHeader } from '@vk/ui';
import type { ReactNode } from 'react';
import { embedConfigOf, isEmbedName } from '../config/embeds';
import type { CalculatorShellInfo } from '../lib/paths';
import { AppMenu } from './app-menu';
import styles from './app-shell.module.css';
import { ScrollMode, type ScrollModeValue } from './scroll-mode';

export type AppShellProps = {
  /**
   * The election's display name, shown next to the wordmark. Only needed on
   * its own for the region picker, before a calculator is chosen — every
   * other screen gets it from `calculator.electionName` instead.
   */
  electionName?: string;
  /**
   * The open calculator's display info and menu links. Once present, it also
   * supplies the header's election name — `electionName` above is then
   * ignored, so callers only ever need to pass one or the other.
   */
  calculator?: CalculatorShellInfo;
  /**
   * What scrolls on this screen.
   *
   * `document` for anything that is read: its content is then the only thing
   * on the page that can pass under Safari's glass address bar, and a
   * `StickyBar` inside it settles snugly above the bar rather than against
   * `dvh`'s far more pessimistic idea of where the bar starts.
   *
   * `pinned` (the default) is for the question flow, which must not scroll at
   * all — see `globals.css` for what each mode does and why.
   */
  scroll?: ScrollModeValue;
  /**
   * A screen that only *shows* a calculator rather than being inside one — the
   * public shared result. The header still names it, but the menu drops
   * "Začít znovu" and "Opustit kalkulačku": both act on the viewer's own
   * answers and progress, and this page is somebody else's result.
   */
  readOnly?: boolean;
  /**
   * The embed partner, when rendering inside an iframe. Calculator screens
   * carry it in `calculator.embed` already; this prop exists for the one
   * shell consumer with no calculator — the district picker.
   */
  embed?: string;
  children: ReactNode;
};

const messages = getMessages();

/**
 * Header and menu — the frame that does not change between screens.
 *
 * The shell owns the full screen and never scrolls; whatever it wraps decides
 * whether *it* scrolls. That is what lets the question flow (fixed, unscrollable
 * by design) and the content screens (a scrolling list) share one header instead
 * of each rebuilding the chrome around their own layout. The backdrop is *not*
 * here — it sits in the root layout, which the router keeps alive across
 * navigations, so the wash never restarts mid-flow.
 */
export function AppShell({
  electionName,
  calculator,
  scroll = 'pinned',
  readOnly = false,
  embed,
  children,
}: AppShellProps) {
  /*
   * Embed chrome: the same shell, two differences. The wordmark becomes the
   * attribution — an outbound link to the full site, in a new tab, because it
   * is the one way out of a partner's iframe (`href="/"` needs no configured
   * base URL: the iframe's own origin is this app). And the menu drops
   * "Opustit kalkulačku": navigating an iframe to our homepage inside someone
   * else's article is not leaving, it is getting lost.
   */
  const embedName = embed ?? calculator?.embed;
  const embedConfig = embedName && isEmbedName(embedName) ? embedConfigOf(embedName) : undefined;

  /*
   * Partner themes are single-mode (light-only — see the theme files in
   * `@vk/tokens`), which pins `color-scheme` at the theme's scope and makes
   * the dark-mode toggle a control that does nothing. A dead toggle is worse
   * than no toggle, so it is withheld exactly when the active embed theme
   * provides only one palette.
   */
  const partnerTheme = embedConfig?.theme
    ? themes.find((theme) => theme.name === embedConfig.theme)
    : undefined;
  const singleModeTheme =
    !!partnerTheme && !(partnerTheme.color?.light && partnerTheme.color?.dark);

  return (
    <div className={styles.shell}>
      <ScrollMode mode={scroll} />

      <div className={styles.content}>
        <div className={styles.bar}>
          <AppHeader
            title={messages.app.title}
            electionName={calculator?.electionName ?? electionName}
            calculatorName={calculator?.name}
            href={embedConfig?.attribution ? '/' : undefined}
            actions={
              <AppMenu
                calculator={readOnly ? undefined : calculator}
                embed={!!embedConfig}
                colorModeToggle={!singleModeTheme}
              />
            }
          />
        </div>

        {children}
      </div>
    </div>
  );
}
