# Changelog

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
