---
version: alpha
name: SINILAI — Administrative Blue
description: >-
  A calm, trustworthy, information-first blue console for Indonesian school
  grade entry. Light theme, dense tables, system-safe typography, honest
  local-mode messaging. Desktop-first, responsive, icon-and-type driven.
colors:
  # ── Brand blue scale (the single chromatic identity) ──
  primary-50: "#EEF4FE"
  primary-100: "#DCE8FD"
  primary-200: "#BBD1FA"
  primary-300: "#8FB4F4"
  primary-400: "#5B8FEA"
  primary-500: "#2D6EDD"
  primary-600: "#1B58C4"
  primary-700: "#1546A0"
  primary-800: "#123A80"
  primary-900: "#0E2E63"
  # ── Semantic theme slots (Tailwind mapping) ──
  background: "#F5F7FA"
  foreground: "#0F1A2A"
  card: "#FFFFFF"
  card-foreground: "#0F1A2A"
  popover: "#FFFFFF"
  popover-foreground: "#0F1A2A"
  primary: "#1B58C4"
  primary-foreground: "#FFFFFF"
  secondary: "#E8EEF7"
  secondary-foreground: "#123A80"
  muted: "#EEF2F8"
  muted-foreground: "#5A6B84"
  accent: "#E1EBFB"
  accent-foreground: "#123A80"
  destructive: "#C0281F"
  destructive-foreground: "#FFFFFF"
  border: "#D9E0EA"
  input: "#C6D0DE"
  ring: "#1B58C4"
  # ── Status semantics ──
  success: "#0F7A3D"
  success-surface: "#E3F4E9"
  warning: "#8A5200"
  warning-surface: "#FBF0D6"
  danger: "#C0281F"
  danger-surface: "#FBE6E4"
  info: "#1546A0"
  info-surface: "#E1EBFB"
  # ── Predikat bands (A/B/C/D) ──
  predikat-a: "#0F7A3D"
  predikat-a-surface: "#E3F4E9"
  predikat-b: "#1B58C4"
  predikat-b-surface: "#E1EBFB"
  predikat-c: "#8A5200"
  predikat-c-surface: "#FBF0D6"
  predikat-d: "#C0281F"
  predikat-d-surface: "#FBE6E4"
  # ── Chart categorical palette + plot furniture ──
  chart-1: "#1B58C4"
  chart-2: "#5B8FEA"
  chart-3: "#0E8C86"
  chart-4: "#8A93A6"
  chart-5: "#C0872A"
  chart-6: "#B4574E"
  chart-grid: "#E4EAF2"
  chart-axis: "#5A6B84"
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.015em
  headline-md:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.005em
  body-lg:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0em
  body-md:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  body-sm:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.005em
  label-md:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.01em
  label-caps:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.08em
  numeric-lg:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.01em
    fontFeature: "tnum"
  numeric-md:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0em
    fontFeature: "tnum"
  mono-sm:
    fontFamily: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0em
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  xxxl: 48px
  gutter: 24px
  content-max: 1440px
  sidebar-width: 240px
  control-height: 36px
  row-height-dense: 40px
  row-height-comfortable: 48px
  touch-target: 44px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "0px 16px"
    height: "{spacing.control-height}"
  button-primary-hover:
    backgroundColor: "{colors.primary-700}"
  button-primary-active:
    backgroundColor: "{colors.primary-800}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "0px 16px"
    height: "{spacing.control-height}"
  button-secondary-hover:
    backgroundColor: "{colors.accent}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "0px 12px"
    height: "{spacing.control-height}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "0px 16px"
    height: "{spacing.control-height}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.sm}"
    size: "{spacing.touch-target}"
  sidebar:
    backgroundColor: "{colors.card}"
    width: "{spacing.sidebar-width}"
  nav-item:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "0px 12px"
    height: "{spacing.row-height-dense}"
  nav-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
  page-header:
    backgroundColor: "{colors.background}"
    padding: "{spacing.lg}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  kpi-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  kpi-value:
    typography: "{typography.numeric-lg}"
    textColor: "{colors.foreground}"
  table-header:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-caps}"
    height: "{spacing.row-height-dense}"
  table-cell:
    typography: "{typography.body-md}"
    textColor: "{colors.foreground}"
    height: "{spacing.row-height-dense}"
    padding: "0px 12px"
  table-row-hover:
    backgroundColor: "{colors.accent}"
  score-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.numeric-md}"
    rounded: "{rounded.sm}"
    height: 32px
    width: 56px
  score-input-focus:
    backgroundColor: "{colors.primary-50}"
    textColor: "{colors.primary-900}"
  score-input-below-kkm:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
  chip-filter:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
    height: 32px
  chip-filter-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  badge-predikat-a:
    backgroundColor: "{colors.predikat-a-surface}"
    textColor: "{colors.predikat-a}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-predikat-b:
    backgroundColor: "{colors.predikat-b-surface}"
    textColor: "{colors.predikat-b}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-predikat-c:
    backgroundColor: "{colors.predikat-c-surface}"
    textColor: "{colors.predikat-c}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-predikat-d:
    backgroundColor: "{colors.predikat-d-surface}"
    textColor: "{colors.predikat-d}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-neutral:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  progress-track:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.full}"
    height: 8px
  progress-fill:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
  progress-fill-complete:
    backgroundColor: "{colors.success}"
    rounded: "{rounded.full}"
  segmented-control:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "2px"
  segmented-item:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "6px 14px"
  segmented-item-active:
    backgroundColor: "{colors.card}"
    textColor: "{colors.primary}"
  bulk-action-bar:
    backgroundColor: "{colors.primary-800}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "0px 16px"
    height: 48px
  local-mode-banner:
    backgroundColor: "{colors.info-surface}"
    textColor: "{colors.info}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  toast:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  toast-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success}"
  toast-error:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
  drawer:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    width: 440px
  confirm-dialog:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
    width: 400px
  empty-state:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxxl}"
---

# SINILAI — Administrative Blue

## Overview

SINILAI is a school grading data-entry tool for Indonesian schools. Its users
are administrative staff and teachers — not designers, not developers — who
enter dozens of scores on a laptop in a busy staff room, often on a projector
or a bright screen. The interface must feel like calm, official school software:
dependable and legible under pressure, friendly enough to not feel like
bureaucratic grey, and never like a marketing page.

The visual direction is **dominant blue, light theme, information-first**. The
whole identity is carried by one deep, trustworthy blue (`primary` `#1B58C4`)
over a cool paper canvas (`background` `#F5F7FA`) with white cards and hairline
borders (`border` `#D9E0EA`). There are no decorative heroes, no photographic
imagery, no blobs, and no two-stop "trust" gradients — depth and hierarchy come
from typography, hairline structure, and generous-but-dense spacing instead.
Icons are monoline, drawn from `lucide-react`, and always inherit
`currentColor`.

Density is a feature: rows are 40px, data tables are the primary object, and
scores are entered keyboard-first. The product is honest about itself — it is
**hybrid** (operate + read), its data lives **only in this browser** with no
login and no cloud. A persistent local-mode chip reading *"Data tersimpan di
perangkat ini"* is part of the chrome, not an afterthought, and the UI never
implies multi-user access or synchronisation. When a value is missing, the
interface says so plainly with an em dash (*"—"*), never a fake zero.

Three deliberate signature moves give the system a memory: (1) tabular,
slightly tightened numerals everywhere a score, average, or total appears, so
columns stack into clean vertical rails; (2) a focused score cell that grows
its figure and gains a primary ring, making fast entry feel physical; and
(3) a sticky save bar that carries the unsaved-changes indicator, the
completeness progress bar, and the single primary action together.

## Colors

The palette is a four-layer system: cool neutrals carry 70–90% of the pixels,
one blue accent carries the interaction, semantic colors appear only as
status, and gradients are effectively unused (<1%).

- **Primary (`#1B58C4`):** The single action color and the brand. Used for the
  one primary button per screen, the active navigation item, the focus ring,
  and at most one chart highlight. Its scale runs `primary-50` (`#EEF4FE`,
  tinted surfaces) to `primary-900` (`#0E2E63`, deep ink). `primary-700`
  (`#1546A0`) is the hover/pressed and inline-link shade; `primary-800`
  (`#123A80`) is used for the bulk-action bar.
- **Background / Card (`#F5F7FA` / `#FFFFFF`):** Never pure white as the page
  canvas. Panels, cards, tables, drawers, and dialogs sit on white so grouped
  data reads as contained regions.
- **Foreground / Muted-foreground (`#0F1A2A` / `#5A6B84`):** Primary text is a
  near-black cool navy; secondary text, captions, and table metadata use the
  muted slate. Both clear **4.5:1** on `background` and `card`. Never set body
  text in `primary-400` or lighter.
- **Secondary / Muted / Accent (`#E8EEF7` / `#EEF2F8` / `#E1EBFB`):** Secondary
  is the neutral button surface; muted is table headers, progress tracks, and
  chip rest; accent is the blue-tinted hover wash for nav items and table rows.
- **Destructive (`#C0281F`):** Reserved for delete actions and destructive
  confirmation. It always appears with a label or an icon, never as color
  alone.
- **Status (`success` `#0F7A3D`, `warning` `#8A5200`, `danger` `#C0281F`,
  `info` `#1546A0`):** Each pairs a saturated ink with a light `-surface` tint
  (e.g. `success-surface` `#E3F4E9`) for badges, banners, and below-KKM
  highlighting. All four inks reach **4.5:1** against white and their own tints.
- **Predikat bands (`predikat-a/b/c/d`):** A (green), B (blue), C (amber),
  D (red) — the same badge shape in four tints so a recap column scans as a
  band, not a rainbow. Amber and red inks are deliberately darkened so predikat
  text stays legible on projector and bright screens.
- **Charts (`chart-1` … `chart-6`):** A categorical ramp derived from the blue
  identity — two blues, a teal, a slate, an ochre, a terracotta — plus
  `chart-grid` (`#E4EAF2`) for gridlines and `chart-axis` (`#5A6B84`) for axis
  labels. Semantic status colors stay reserved and are never reused as chart
  categories.

## Typography

Typography is entirely **system-safe and self-hostable**: no Google Fonts, no
external CDN, no `@import`. Latin/Indonesian text uses a native system stack
(`-apple-system, Segoe UI, Roboto, …`); numeric and code contexts use a system
monospace stack. Heading/display character comes from **weight and tracking**,
never from a downloaded face.

- **Display & headlines:** `display` (28px/600), `headline-lg` (22px/600),
  `headline-md` (18px/600), and `headline-sm` (15px/600) use progressively
  tighter negative tracking (-0.02em → -0.005em) to read as engineered and
  official. One screen shows at most three sizes above the fold.
- **Body:** `body-lg` (16px/400) for page descriptions and form intro copy;
  `body-md` (14px/400) for table cells, list rows, and general text;
  `body-sm` (13px/400) for helper text and dense metadata. Body copy is never
  justified, and long descriptions cap near 65ch.
- **Labels:** `label-md` (13px/500) is the workhorse for buttons, nav items,
  tabular headers, and field labels. `label-caps` (11px/600, uppercase,
  0.08em tracking) is reserved for table column headers, eyebrows, and predikat
  chips — uppercase always keeps positive tracking.
- **Numerals:** `numeric-lg` (30px/600, tabular) carries KPI figures;
  `numeric-md` (15px/500, tabular) carries score cells, Nilai Akhir, averages,
  and counts. Tabular figures (`fontFeature: "tnum"`) are mandatory wherever
  numbers stack in a column so digits align. `mono-sm` is used only for IDs,
  import column-mapping previews, and keyboard hints.
- **Weight discipline:** exactly three weights — 400 (read), 500 (emphasize/UI),
  600 (announce). Weight 700 is not used.
- **Formatting:** numbers follow Indonesian convention — decimal comma,
  thousands dot (`87,5`; `1.240`) — and dates read dd/mm/yyyy. Missing values
  render the em dash `—`, never `0`.

## Layout

The layout is a **fixed left sidebar + fluid content** admin frame, built for
the desktop-first 1280px+ case and degrading cleanly.

- **Desktop ≥1280px (primary):** a persistent 240px `sidebar` (`spacing.sidebar-width`)
  on `card` white with a hairline right border, content capped at 1440px
  (`spacing.content-max`) with a 24px gutter. Tables are wide, and the score
  grid shows every component column at once.
- **768–1279px:** the sidebar collapses to an icon rail; tables keep a
  contained horizontal scroll (a `primary-50` scrollbar track, shadows only on
  the scroll edge) with the identity column (student name / NIS) pinned left and
  a sticky header.
- **<768px:** navigation becomes a drawer; the score grid becomes one card per
  student; primary entry and save actions stay reachable in the sticky save bar
  so the body never scrolls horizontally.

Spacing is a strict 4px base (`spacing.base`): `xs` 4 → `xxl` 32 → `xxxl` 48.
Vertical rhythm groups content with 8–12px inside a region and 24–48px between
regions, so grouping is expressed by proximity before borders. Rows are 40px
(`spacing.row-height-dense`) for data tables and 48px
(`spacing.row-height-comfortable`) for touch lists; form controls are 36px
(`spacing.control-height`) on desktop. Every interactive target is at least
**44×44 CSS px** (`spacing.touch-target`) on touch surfaces, and focus rings
always use the 2px primary ring described under Elevation & Depth. Page
headers pair a title, a one-line contextual description, and exactly one
primary action, right-aligned.

## Elevation & Depth

On a light canvas, hierarchy is conveyed mainly by **surface tone and hairline
borders**, with shadow reserved for genuinely floating layers. This keeps the
dense screens quiet and avoids the "AI dashboard tile" look.

- **Level 0 — Canvas:** `background` flat, no shadow. Cards are separated by
  `border` hairlines, not by glow.
- **Level 1 — Card / panel:** `card` white, 1px `border` hairline,
  `rounded.lg`. No shadow at rest; a hover on interactive cards deepens the
  border to `input` and washes the surface with `accent`.
- **Level 2 — Popover / dropdown / tooltip:** `popover` white, `rounded.md`,
  a soft low-opacity shadow (e.g. `0 4px 12px rgba(15,26,42,0.10)`) plus a
  1px hairline.
- **Level 3 — Drawer / modal:** `drawer` / `confirm-dialog`, `rounded.xl`,
  a stronger shadow (`0 16px 40px rgba(15,26,42,0.18)`), over an overlay scrim
  of `rgba(15,26,42,0.45)`.
- **Level 4 — Toast:** `toast`, `rounded.md`, elevated shadow, anchored
  bottom-right — the same corner for every toast in the app.

**Focus:** keyboard focus always draws a visible ring — a 2px `ring`
(`#1B58C4`) at 3:1 or better against the adjacent surface and the unfocused
state — with a 2px offset in the surface color. The outline is removed only
when this replacement ring is present; `:focus-visible` governs mouse-vs-keyboard.
Destructive confirmations and unsaved-changes prompts are assertive
(`role="alertdialog"`); toasts and save-success feedback are polite
(`role="status"`) and never steal focus.

## Shapes

The shape language is **soft-rectangular and consistent** — a calm, modern
administrative frame that avoids both hard engineering corners and playful
pill-everything.

- **`rounded.sm` (6px):** buttons, inputs, score cells, nav items — every
  control the user touches.
- **`rounded.md` (8px):** popovers, toasts, segmented controls, the
  local-mode banner, and the bulk-action bar.
- **`rounded.lg` (12px):** cards, KPI tiles, and table containers.
- **`rounded.xl` (16px):** form drawers and dialogs.
- **`rounded.full` (9999px):** filter chips, predikat badges, and progress
  bars only.
- **`rounded.none` (0px):** only structural seams — scrolled table edges and
  the sticky header's flush corners.

Rounded and sharp corners are never mixed within one view. The score grid's
cells and header cells share `rounded.sm` on the outer corners so the grid
reads as one ruled sheet. A colored left-border accent on a rounded card is
explicitly disallowed.

## Components

**Buttons.** `button-primary` (blue fill, white text) is the only solid-accent
button on a screen — *"Tambah Sekolah"*, *"Simpan Nilai"*, *"Impor"*. Its
hover/active states are `button-primary-hover` (`primary-700`) and
`button-primary-active` (`primary-800`). `button-secondary` (secondary surface)
for the alternate action in a pair, `button-ghost` for toolbar and inline
actions, and `button-destructive` (red fill) for confirmed deletes. Every
button must remain ≥44px tall on touch surfaces; `button-icon` uses a 44px
square hit area around a 18–20px monoline lucide icon.

**Navigation.** `sidebar` (white, hairline border) holds a brand block and 6–8
`nav-item` rows (icon + `label-md`). The current route uses `nav-item-active`
(blue tint + deep-blue ink) and a 3px left rail; hover uses the same tint at
half strength. On mobile the same items render in a drawer with the brand at
top.

**Page header & filters.** `page-header` pairs `headline-lg` title,
`body-sm` contextual description, and one primary action. Below it a filter
row uses `chip-filter` pills for school / class / subject / academic year
(active = `chip-filter-active`) plus a search input; the chosen filters persist
as visible context (and as breadcrumb-ish chips) so users never have to
remember their last selection.

**Tables & score grid.** `table-header` is a sticky `muted` bar with
`label-caps` uppercase column labels; `table-cell` uses `body-md` at 40px rows
with a hairline row separator. Sortable headers show a caret; numeric columns
are right-aligned with tabular figures; the identity column pins left.
`table-row-hover` applies the `accent` wash. Selection checkboxes reveal a
`bulk-action-bar` (deep blue, white text) with a count and bulk actions. The
core **Input Nilai** grid uses `score-input` (32px tall, 56px wide, centered
tabular numerals); `score-input-focus` tints and rings the active cell and
grows its figure; `score-input-below-kkm` paints the `danger-surface` with
`danger` ink and a small warning icon so below-KKM is never color-only. Tabs or
`segmented-control` switch the active assessment component (PH1 / PH2 / UTS /
UAS); an em dash marks components with no score, and Nilai Akhir is computed
only over scored components.

**Forms.** Drawers and dialogs use `drawer` / `confirm-dialog` with `label-md`
labels, a red `*` required marker, helper text in `body-sm`, and inline errors
in `danger` with `role="alert"`; validation fires on blur, not on first
keystroke. Weight inputs sum and warn when the total ≠ 100%. Delete
confirmations state the affected record count in the copy (e.g. *"Hapus 32
nilai siswa?"*). The import flow is a three-step drawer: file picker →
column-mapping preview (mono for raw headers) → per-row error report, ending in
a success summary (*"24 baris berhasil, 2 dilewati"*), with a downloadable
template always available.

**Badges, progress & feedback.** Predikat renders as
`badge-predikat-a/b/c/d`; neutral statuses use `badge-neutral`.
`progress-track` + `progress-fill` show input completeness per class and inside
the sticky save bar (`progress-fill-complete` turns `success` green at 100%).
The unsaved-changes indicator is a `warning` dot + text (never color alone).
`toast` variants (`toast-success`, `toast-error`) confirm saves and imports;
`local-mode-banner` is the always-visible honesty notice —
*"Data tersimpan di perangkat ini — mode lokal, tanpa login."*

**Charts.** Hand-built SVG/CSS only. A sorted horizontal bar uses `chart-1`
with `chart-grid` gridlines; the predikat distribution uses stacked/grouped
bars in `predikat-a/b/c/d`; completeness-per-class reuses `progress-fill`.
Label rules: category labels in `body-sm` `chart-axis` ink, values in
`numeric-md` tabular at the bar end, axis values in `body-sm`; keep chart
labels and values readable in a static screenshot and always provide a text
summary (or `aria-label`) for screen readers.

**Empty & edge states.** `empty-state` uses a lucide icon, a `headline-md`
message, one `body-md` explanation, and a single primary CTA. First-run shows
an onboarding prompt to create the first school; empty collections, no-filter
matches, and unselected class/subject each get their own honest message and
recovery action — a blank panel or bare *"Tidak ada data"* is not acceptable.

## Do's and Don'ts

- **Do** keep at most one `button-primary` per screen; secondary and ghost
  carry everything else.
- **Do** hold body text and muted text at **4.5:1** or better on `background`
  and `card`, and non-text UI (borders, icons, charts) at **3:1**.
- **Do** keep every touch target at **44×44 CSS px** or larger, and always show
  a visible 2px primary focus ring for keyboard users.
- **Do** use tabular numerals for every score, average, count, and total, and
  format numbers with a decimal comma and thousands dot.
- **Do** state the local-only data mode plainly and keep *"Data tersimpan di
  perangkat ini"* visible; never imply login, accounts, or cloud sync.
- **Do** render the em dash `—` for missing scores and averages rather than a
  zero, and design the empty, no-match, error, import-error, and unsaved states
  for every screen.
- **Don't** use indigo/violet (`#6366F1`, `#4F46E5`, `#7C3AED`), purple→blue or
  blue→cyan gradients, decorative blobs, emoji-as-icons, or photographic/image
  placeholders — this is an icon- and type-driven console.
- **Don't** put a colored left-border accent on a rounded card, and don't mix
  rounded and sharp corners in one view.
- **Don't** convey status or error by color alone — always pair with an icon,
  label, or positional cue.
- **Don't** introduce a second accent color, more than three type sizes above
  the fold, weight 700, or a downloaded webfont; heading character comes from
  weight and tracking.
