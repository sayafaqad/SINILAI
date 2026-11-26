# ASSETS.md — Image Manifest

Project: SINILAI — Aplikasi Input Nilai Siswa (multi sekolah, multi mata pelajaran).

## Image Manifest

| Slot | Path / URL | Source | Mode | Intended usage | Status |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | No imagery required |

**Generated count: 0** (of the 8-image ceiling). No additional-image approval requested.

## Rationale

SINILAI is an icon- and typography-driven administrative console, as specified in the
approved visual design (`DESIGN.md`, section "Do's and Don'ts"): no photographic imagery,
no illustrative placeholders, no decorative artwork.

- **Icons:** all monoline icons come from the already-installed `lucide-react` package and
  inherit `currentColor`. They are inline SVG components, not image files, so they need no
  manifest entry.
- **Charts:** the dashboard charts (average score per subject, predikat distribution,
  input completeness per class) are hand-written inline SVG/CSS using the chart tokens in
  `src/styles.css`. They require no image files.
- **Brand mark:** the sidebar identity block is set in type and a lucide glyph, so no logo
  bitmap exists.
- **Fonts:** system-safe stacks only (`-apple-system, Segoe UI, Roboto, …` plus a system
  monospace stack). No webfont files are self-hosted, downloaded, or referenced from any
  external CDN — verified: no `@import`, no `fonts.googleapis.com`, no `fonts.gstatic.com`.

`public/assets/images/placeholder.svg` ships with the base template. It is **not referenced
by runtime code** (no media slot needs a placeholder). It is retained as an unused template
asset; no page content was added merely to consume it.

## Excel templates (not images)

The student-import template and recap exports are generated at runtime in the browser from
data (SheetJS `xlsx`), so they are not static assets either.
