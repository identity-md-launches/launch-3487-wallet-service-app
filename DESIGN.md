# IMD EDGE design

Extracted from the final source (`src/styles.css`, `src/*.tsx`, `index.html`) after the last correction.

## Overview

A dark, quiet sports board for people holding IMD on Ethereum. The product is the list of match cards; everything
else (header, intro, side panels) stays small so a fixture and its pick buttons are on the first screen at 390 wide.
One lime accent marks what you can act on: the primary button, the chosen pick, links and the total price. Density is
medium: 16px card padding, 12px between cards, 48px pick targets.

## Colors

Defined in `src/styles.css` `:root`, in `oklch()`. Components use only the semantic tokens.

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `--ink-950` `oklch(0.16 0.02 260)` | Page background, wallet rows |
| `--color-surface` | `--ink-900` `oklch(0.2 0.022 260)` | Cards, panels, sheet, quiet buttons, chips |
| `--color-surface-hover` | `--ink-850` `oklch(0.235 0.024 260)` | Hover on surfaces, chips, picks, rows |
| `--color-border` | `--ink-800` `oklch(0.28 0.025 260)` | Card and panel borders, dividers |
| `--color-border-strong` | `--ink-700` `oklch(0.36 0.025 260)` | Pick and quiet-button borders, empty state |
| `--color-text` | `--ink-100` `oklch(0.96 0.006 260)` | Primary text, selected chip fill |
| `--color-text-muted` | `--ink-300` `oklch(0.78 0.015 260)` | Secondary text, meta, hints |
| `--color-accent` / `--color-accent-hover` | `--lime-400` `oklch(0.89 0.2 128)` / `--lime-300` `oklch(0.93 0.16 128)` | Primary button, checked pick, links, total, logo |
| `--color-on-accent` | `--lime-950` `oklch(0.22 0.05 128)` | Text on accent fills |
| `--color-focus` | `--ink-100` | 2px focus ring |
| `--color-mark-bg` | `--ink-850` | Logo tile |
| `--color-danger` | `--red-400` `oklch(0.76 0.14 25)` | Reserved for errors (defined, not rendered in the current flows) |

Contrast: the design probe measured every solid text pair at 4.5:1 or better at 320, 390 and 1440 wide; text over
team badges and the loading gradient was not measured.

## Typography

- Families: `--font-sans` system UI stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, …`), and
  `--font-mono` (`ui-monospace, "SF Mono", Menlo, Consolas`) for addresses only. No web fonts are bundled.
- Weights: 400 body, 600 controls and labels, 700 headings and team names.
- Scale (six sizes): `--fs-xs` 13px meta and fine print; `--fs-sm` 15px controls, hints, panel copy; `--fs-md` 17px
  body; `--fs-lg` 20px team names, panel and sheet headings, desktop lede; `--fs-xl` 28px h1 on phones;
  `--fs-2xl` 44px h1 from 960px.
- Line height: 1.5 body, 1.1 h1, 1.2 headings and buttons, 1.25 pick labels. h1 tracking -0.02em (-0.03em at 44px);
  logo wordmark +0.02em; nothing else is tracked.
- `font-variant-numeric: tabular-nums` on kickoff times, prices (`.num`) and step numbers. The lede is capped at 56ch.
- Sentence case everywhere; the only capitals are the IMD EDGE wordmark.

## Layout

- Spacing tokens `--s-1`…`--s-7`: 4, 8, 12, 16, 24, 32, 48px.
- `.wrap`: max 1160px, 16px inline padding.
- Under 960px: one column (intro, sport chips, cards, then side panels). Grids use `minmax(0, 1fr)` tracks so long
  rows (the chip strip) scroll inside their own box instead of widening the page.
- From 960px: `.layout` is `minmax(0, 1fr) 360px` with a 32px gap; the intro spans both columns; the side column is
  sticky at 24px from the top.
- Sport chips scroll horizontally on narrow screens. Pick buttons share the card width equally (2 or 3 columns) and
  wrap long team names inside the button.
- The connect sheet is a bottom sheet under 640px and centered from 640px.

## Elevation & depth

Mostly flat: surfaces are separated by tone and 1px borders. The only shadow is `--shadow-sheet` (1px light ring and a
soft drop) on the connect sheet, over a 60% black backdrop.

## Shapes

`--radius-sm` 8px buttons, picks, rows, focus ring; `--radius-md` 12px (logo tile uses 14/64 of its size);
`--radius-lg` 16px cards, panels, sheet; chips are pills (999px). The 28px wallet marks are clipped at 6px.

## Components

| Component | Source | Notes |
| --- | --- | --- |
| Buttons `.btn` + `.btn-primary` / `.btn-quiet` / `.btn-block` | `src/styles.css` | 44px min height; hover lightens; press `scale(0.96)`; disabled 60% opacity; 2px focus ring. One primary per view. |
| Connect control and sheet | `src/ConnectSheet.tsx` | States: Connect, `Switch to Ethereum`, `0x1234…abcd · Disconnect`. Sheet: dialog with title and ×, focus moves to × and returns on close; Escape, backdrop and × close it; 48px rows with wallet marks; pending row reads "· opening…"; a declined request shows one line under the rows. |
| Sport chips `.chip` | `src/App.tsx` | Toggle buttons with `aria-pressed`; the pressed chip inverts to text color. |
| Fixture card `.card` | `src/App.tsx` `FixtureCard` | League and local kickoff, teams with badges (missing badge falls back to a neutral disc), then a radio group of picks (`.pick`, native radios, visually styled). Football adds Draw. |
| Pay panel `.pay` | `src/PayPanel.tsx` | Price split (0.5 swarm, 0.5 creator, 1 total) then one full-width action that walks through: payments not active, Connect, Switch, checking, not enough IMD, Approve 1 IMD, Pay 1 IMD and get analysis, Paid. Hints and errors sit under the button in a `role="status"` line. |
| Panels `.panel` | `src/App.tsx`, `src/MyPredictions.tsx` | Your predictions (live region, polls the swarm every 20s until a job id appears), How a prediction works, Contracts on Ethereum. |
| Empty and loading | `src/App.tsx` | Three skeleton cards while loading; a filter with no matches names the sport and offers "Show all sports". |
| Logo | `src/Logo.tsx`, `public/favicon.svg`, `public/og.png` | An apex mark (lime stroke, light crossbar) on a dark tile plus the IMD EDGE wordmark. Original artwork. |

## Do's and don'ts

- Do start a new page from `.wrap` and `.layout`, and group content in `.panel` or `.card`. Do not nest cards.
- Do use `--color-accent` only for things you can act on and for the total price; static text stays neutral.
- Do keep one `.btn-primary` per view; other actions are `.btn-quiet` or links.
- Do take sizes from the six `--fs-*` tokens; do not add a seventh size or tracked capitals above headings.
- Do keep every control at least 40px (chips) or 44px (buttons) high; wallet rows 48px.
- Don't add `transition: all`; list the properties, with `var(--ease)` and 150ms.
- Recipe for a new page section: `<section class="panel" aria-labelledby="id"><h2 id="id">Title</h2>…</section>`,
  placed in `.side` or after `.board`, using `.muted` for secondary text and `.btn` for actions.
