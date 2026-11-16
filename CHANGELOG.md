# Changelog

## 0.5.0 — 2026-11-16

- The full-screen viewer can be resized: drag the right edge, bottom edge or the
  bottom-right corner. The panel is pinned at its current position and grows
  right/down, clamped to 420×300 px minimum and 94vw×94vh maximum, and the zoom
  preset re-fits while dragging. The chosen size is remembered in `localStorage`
  and used the next time the viewer opens.

## 0.4.0 — 2026-11-16

- Viewport-lazy rendering: a diagram is rendered only when its block comes within
  400 px of the viewport; farther blocks keep their native code block, so long
  chat histories no longer render every diagram on load. An
  `IntersectionObserver` is the primary trigger, with a scroll/resize/poll
  geometry fallback for renderers where intersection callbacks are paused.
  Rendered diagrams are kept (no recycling).

## 0.3.0 — 2026-11-16

- Sequence diagrams: every `actor` / `participant` now gets its own hue — actor
  box (or stick figure), border and label are tinted from a seven-color palette
  assigned left-to-right, so the header row and the messages under it are easy to
  map together.

## 0.2.0 — 2026-11-16

- Default flowchart `subgraph` clusters now get distinct theme-hued backgrounds,
  borders and label tints, cycled in reading order (blue → amber → purple → green
  → red), so diagrams with several large blocks are easier to scan. Nested
  clusters use a lighter tint. Clusters with diagram-supplied `style`/`classDef`
  colors are preserved untouched.

## 0.1.0 — 2026-11-12

First public release.

- Renders fenced ` ```mermaid ` code blocks inline as SVG in the DSH Web UI, with
  the original source one toggle away.
- Theme-aware palette derived from the DSH design tokens; a post-render contrast
  pass re-tints diagram-supplied fills and text that cannot carry the theme ink.
- Mermaid `neo` look with rounded shapes, accent-tinted notes/activations, thin
  connectors and a soft shadow.
- Figure card with a quiet toolbar: diagram-type label, copy source, fit/actual
  size, full screen and source/diagram toggle; hover state and reveal animation.
- Bounded inline canvas for tall diagrams plus a full-screen viewer with
  fit-screen / fit-width / actual-size presets, zoom, pan, `Esc` and keyboard
  shortcuts.
- Localized labels (English / 中文) through the DSH Client locale service.
- Streaming-aware: a block that changes while the answer streams re-renders when
  its text settles; unparsable blocks fall back to plain code.
