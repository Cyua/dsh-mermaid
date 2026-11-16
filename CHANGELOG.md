# Changelog

## 0.8.1 — 2026-11-16

- Fix **Save as image** failing with “图片保存失败” on flowcharts: Chromium
  tainted the export canvas because Mermaid renders HTML node labels inside
  `<foreignObject>`, and `toBlob` refuses tainted canvases. The export copy now
  replaces those labels with SVG `<text>` (same lines, font, color and position)
  before rasterizing; sequence diagrams (which already use SVG text) were not
  affected. Verified with a 418×330 flowchart carrying 5 HTML labels → 932×756
  PNG, and the Desktop native save dialog opens (`mode=saveAs`).

## 0.8.0 — 2026-11-16

- Add **Save as image** to the diagram toolbar and the full-screen viewer. The
  diagram is rasterized to a 2× PNG with the card background and 24 px padding,
  including HTML (`foreignObject`) labels. On Desktop the DSH `fileActions`
  service opens the native save dialog and reports the saved path; on Web, or
  when the service is missing, the PNG downloads. Filenames are
  `mermaid-<type>-<timestamp>.png`, and failures show a status message instead of
  disturbing the diagram.

## 0.7.2 — 2026-11-16

- Distribution: the release script now emits the npm tarball as the primary
  artifact (`cyua-dsh-mermaid-<version>.tgz`), which DSH can install directly —
  no unzip — through the Web UI's “压缩包 / Tarball” install subject or
  `install_bundle` with the file path (`file:` spec or plain path). The zip stays
  as a folder-based fallback and both artifacts print their SHA-256.

## 0.7.1 — 2026-11-16

- Add `npm run release:zip`: a self-contained, shareable zip of the published
  bundle plus a Chinese install note (and its SHA-256), for internal file shares
  where recipients cannot reach a package registry.

## 0.7.0 — 2026-11-16

- The full-screen viewer no longer sits under the Windows native caption buttons.
  Those buttons are Electron's Window Controls Overlay, painted above the page and
  impossible to cover with CSS, so the viewer reserves the same top clearance DSH
  uses for its own overlays (`--dsh-frame-top-clearance`, 40 px in the tested
  build): the panel starts below that row, the toolbar is visible, and dragging
  the top edge stops there.
- The viewer toolbar controls are centered in the bar, with the diagram type on
  the left — clear of the top-right native buttons even on a nearly full-screen
  panel. The default panel size also respects the reserved row.

## 0.6.0 — 2026-11-16

- The full-screen viewer leaves less empty space: the overlay gap is now 1vw/1vh
  (was 3vw/3vh), so the panel can grow to 98vw×98vh, and the default size follows
  that cap.
- Double-click the viewer title bar to fill the window; double-click again (or
  resize manually) to go back to the previous size.

## 0.5.1 — 2026-11-16

- The viewer panel now resizes from **all** edges and corners (left, right, top,
  bottom and the four corners), each pinned to the opposite edge while dragging;
  a drag can no longer push the panel past the window padding. The stored size is
  still restored the next time the viewer opens.

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
