# Volební kalkulačka

A themable, localizable voting advice application. React + TypeScript.

## Getting started

```bash
pnpm install
pnpm dev          # app at http://localhost:3000
pnpm storybook    # design system at http://localhost:6006
```

Other commands: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm build`.

Requires Node 20.9+ and pnpm.

## Layout

```
apps/web          Next.js — routes, data loading, providers. Deliberately thin.
packages/tokens   theme contract, defineTheme, CSS derivation, built-in themes
packages/ui       presentational design system (React + CSS Modules)
packages/core     domain model, data adapters, match calculation, URL grammar
packages/i18n     locales, message catalogs, localized route slugs
```

The rule that keeps this replaceable: everything the product *knows* lives in
`packages/*`, and `apps/web` only wires it to a framework.

## Theming

A theme is a small typed file — see
[`packages/tokens/src/themes/midnight.theme.ts`](packages/tokens/src/themes/midnight.theme.ts),
which re-skins the whole app in about 30 lines. You set typefaces and roughly a
dozen colours; every hover, active, soft and on-colour variant is derived in CSS
from those, as is the fluid type and spacing scale.

To add one: copy a `.theme.ts` file, register it in
`packages/tokens/src/themes/index.ts`, and select it with `data-theme="<name>"`.

Two rules make this hold:

- Components style themselves only through `var(--vk-*)`. No hardcoded colours,
  no utility classes in markup.
- `@vk/ui` receives every string as a prop and never imports i18n.

Check your work by switching the Theme toolbar in Storybook. Anything that does
not change has a hardcoded value where a token belongs.

## Data

The POC runs on committed archive fixtures (Komunální 2022 / Pardubice — 42
questions, 9 candidates) so the whole flow is testable without a network call.
`packages/core/src/adapters/` translates that legacy shape into the canonical
model, so swapping in the real backend later touches one directory.
