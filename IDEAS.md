# Ideas inbox

Not the plan — the plan is tracked separately per phase. This is somewhere to
drop half-formed ideas so they survive between sessions instead of getting
lost in chat. Write in fragments; expect Claude to flesh out, scope, or push
back when one gets picked up.

Move an item to a section below once it's been looked at, so this stays a
queue of what's actually still open.

## Open

- **Palette generation from seed colours.** A partner gives 1–2 seed colours
  (brand primary, maybe a secondary) instead of hand-picking all ~10 semantic
  colours a theme needs. We generate a few well-crafted OKLCH-based palette
  candidates from the seed(s) for them to choose between — "well-crafted" is
  subjective enough that one deterministic output probably isn't right.
  Would live next to `defineTheme` in `packages/tokens`, e.g. a
  `paletteFromSeed()` helper. Depends on/relates to the light/dark mode work
  (2026-08-02) — a generated palette would presumably need to propose both a
  light and dark variant, not just one.

## Later / parked

## Declined
