# dsh-mermaid

A [DeepSeek Harness](https://github.com/deepseek-ai) Web UI plugin that turns
fenced ```` ```mermaid ```` code blocks in the chat into inline diagrams. The
original Mermaid source stays one click away.

- Inline SVG rendered by [Mermaid](https://mermaid.js.org/) 12 inside the page —
  no CDN, no extra HTTP route, no external service.
- Theme-aware: the palette is derived from the DSH design tokens, and a
  post-render contrast pass repairs diagram colors that would sink into the card.
- Designed to sit in the chat: a rounded figure card with a quiet toolbar, hover
  state, reveal animation and Mermaid's modern `neo` look.
- Multi-block flowcharts are easier to scan: default `subgraph` groups get
  distinct theme-hued backgrounds and borders, cycled in reading order.
- Sequence diagrams read faster too: each `actor` / `participant` box, stick
  figure and label gets its own hue from the same palette.
- Large diagrams stay usable: bounded inline height, an *Open full screen* viewer
  with fit-screen / fit-width / actual-size presets, zoom, pan and keyboard
  shortcuts. The viewer panel is resizable from any edge or corner, and
  **double-clicking its title bar fills the window** (a second double-click
  restores the previous size); it remembers the last size you chose and stays
  clear of the Windows native caption buttons.
- **Save as image**: the toolbar and the viewer can export the diagram as a PNG
  (2× raster with the card background and padding). On Desktop the DSH
  `fileActions` service opens the native *Save as* dialog and reports the saved
  path; on Web, or when that service is unavailable, the PNG is downloaded.
- Viewport-lazy rendering: a diagram is rendered when it comes within 400 px of
  the viewport, so a long chat history does not pay for every diagram up front —
  faraway blocks keep their native code block until they approach the view.
- Localized (English / 中文) through the DSH Client locale service. The client
  bundle loads before that service on a cold start, so the translator is bound
  through `ctx.inject(['locale'])` and already-rendered cards re-label when it
  arrives (or when the language changes).
- Streaming-aware: a block that changes while the answer streams re-renders when
  its text settles, and a block that cannot parse falls back to plain code.

## Requirements

- DeepSeek Harness desktop with the Web UI and the `plugin_manager` plugin
  (bundled with the desktop app).
- Verified with **DSH desktop 0.2.2-rc.3**. The plugin looks at the Markdown
  code-block DOM and the Client `theme` / `locale` services, so a DSH release
  that changes those internals may need a plugin update.

## Install

Inside a DSH session:

1. Install the bundle from the package registry:

   ```
   plugin_manager  action = install_bundle
                   target = @cyua/dsh-mermaid
   ```

   For an internal registry, publish it first (see [Publishing](#publishing)) or
   install straight from a checkout directory:

   ```
   plugin_manager  action = install_bundle
                   target = <path-to-checkout>
   ```

2. The Loader patch adds the row `cyua-mermaid-render`. Enable it in the plugin
   list (or with `plugin_manager action = set_plugin`) if it is not enabled yet.
3. Reload the page if the diagrams do not appear yet — the Client module is
   loaded at page boot.

To upgrade, install the new version and reload; to remove, use
`plugin_manager action = remove_bundle target = @cyua/dsh-mermaid`.

## Sharing without a registry (tarball)

For an internal file share, build the tarball:

```powershell
npm install        # once
npm run release:tgz
```

The script builds the release Client half and writes
`release/cyua-dsh-mermaid-<version>.tgz` (~1.5 MB) with its SHA-256. DSH installs
a tarball directly, no unzip: in the Web UI's plugin page choose the
**“压缩包 / Tarball”** install subject and give the file path, or run

```text
plugin_manager  action = install_bundle
                target = <dir>\cyua-dsh-mermaid-<version>.tgz
```

`file:<path>` also works. The profile keeps its own installed copy, so the
tarball may be deleted or moved after installing.

No Node.js or npm is needed on the recipient machine — DSH installs the bundle
itself and the tarball already contains the built `dist/client.js`. To upgrade,
install the new tarball; `remove_bundle target=@cyua/dsh-mermaid` uninstalls.

## Usage

Write a normal fenced block:

````markdown
```mermaid
flowchart LR
  A[Input] --> B{Is it a diagram?}
  B -->|yes| C[Rendered SVG]
```
````

The rendered figure has a toolbar with:

- the detected diagram family (`时序图`, `流程图`, `类图`, …),
- **copy source** (shows a check mark when copied),
- **actual size / fit width** (only when the diagram is wider than the card),
- **save as image** (PNG, 2× with the card background),
- **open full screen**, and
- **view source / view diagram**.

In the full-screen viewer: `−  100%  +`, *fit screen*, *fit width*,
*actual size*, *save as image*, close; `Esc` closes, `+`/`-` zoom, `0` fits,
scrollbars pan, and the panel can be resized from any edge or corner. On
Desktop, *save as image* opens the native save dialog; on Web it downloads.

## Development

```powershell
git clone https://github.com/Cyua/dsh-mermaid.git
cd dsh-mermaid
npm install          # mermaid + esbuild (dev only)
npm run build        # release build -> dist/client.js
npm run verify       # checks the artifact before publishing
```

`dist/` is generated and git-ignored; `npm install` / `npm pack` / `npm publish`
build it automatically through the `prepare` script.

Install the local checkout into your profile to try changes:

```
plugin_manager  action = install_bundle
                target = <path-to-checkout>
```

After rebuilding, reload the Client module by disabling and re-enabling the
`cyua-mermaid-render` row (or restart DSH): the page pins the module generation
it booted with, so a changed file is not picked up on its own.

`dev/verification/` contains a loopback verification harness (a report server
plus a temporary observer plugin) used to check the plugin inside the running
Web UI; it is not part of the published package.

## Publishing

The package is a normal npm package with DSH bundle metadata (`dsh.bundle.patch`
and `dsh.client` in `package.json`). There is no separate plugin archive format.

1. Update `version` in `package.json` and add a `CHANGELOG.md` entry.
2. `npm run check` (syntax + build + artifact check).
3. `npm pack --dry-run` to review the file list and size (~5 MB, Mermaid is
   bundled).
4. Publish to the internal registry (needs an account/scope allowed to publish
   `@cyua`):

   ```powershell
   npm publish --registry <your-internal-registry> --access restricted
   ```

   If the `@cyua` scope does not exist on the registry yet, register it or rename
   the package (`name` in `package.json` and in `cordis.patch.yml`; the Client
   module id is derived from `package.json` automatically).

The release build compiles out every diagnostic call site, and `npm run verify`
fails if the artifact still contains local reporter strings or is not in the DSH
module-loader format. Do not publish a `--debug` build.

## Design notes

### Look and feel

The figure is a card that matches the surrounding UI instead of a raw `<svg>`:

- **Toolbar.** A small hexagon mark plus the diagram family on the left; icon
  buttons on the right (copy source, fit/actual size, full screen, source).
  Buttons are dimmed until the card is hovered or focused.
- **Card.** 16 px corner radius (from `--dsw-radius-lg`, plus `corner-shape` when
  supported), a hairline border (`--dsw-alias-border-l1`), a faint top sheen, and
  a border/shadow lift on hover.
- **Canvas.** Generous padding, centered content, thin scrollbars plus an edge
  mask when a diagram scrolls, and a 220 ms fade/slide-in.
- **Diagram surface.** Mermaid's `neo` look with `base` theme variables taken
  from the DSH aliases; 9 px rounded corners on actors, notes, loop labels and
  `rect` sections; accent-tinted notes and activations; 1.1 px connectors; a
  single soft drop shadow instead of Mermaid's hard offset emboss.
- **Subgraph colors.** Flowchart `subgraph … end` groups all share one neutral
  cluster fill by default, which makes diagrams with several blocks hard to
  scan. Untouched clusters get a distinct hue from the theme tokens (blue,
  amber, purple, green, red — cycled in reading order, nested groups slightly
  lighter), and their labels are tinted toward the same hue while staying
  readable. Clusters the diagram styles itself (`style GROUP fill:…`,
  `classDef`) are left exactly as written.
- **Participant colors.** Sequence diagrams use one neutral actor box for every
  `actor` / `participant`. Each participant is tinted left-to-right from a
  seven-hue palette (blue, purple, pink, red, amber, green, teal): the actor box
  or stick figure, its border and its label text all match, and the top/bottom
  mirror boxes share the same hue.

### Readability

Mermaid's stock dark theme and diagram sources designed for a white page are the
two reasons a rendered diagram can look washed out on a dark card. The plugin
renders with the `base` theme and fills every diagram variable from the DSH
aliases (`--dsw-alias-bg-layer-*`, `--dsw-alias-label-*`, borders, state colors),
read from the live page; a theme switch re-initializes and re-renders. Sources
often carry their own colors (`rect rgb(255,247,230)` bands, `box rgb(...)`
groups, `style` overrides) that assume dark ink on white: after rendering, a
surface that cannot carry the theme ink is re-tinted at the theme's lightness
with its hue preserved (a cream band becomes a dark warm band), and text that
still lands on a busy surface is given the best available ink. Comfortably
readable text is never touched.

### Large diagrams

- **Inline card** — the card width is respected: the SVG scales until it fits
  horizontally, and the canvas is height-bounded
  (`max-height: min(72vh, 720px)`) with its own scrollbars and edge fades. When
  the fitted scale drops below 0.62 (or the diagram is taller than the canvas), a
  floating **全屏查看 / Open full screen** pill appears; double-clicking the
  diagram does the same.
- **Full screen viewer** — a modal with the whole diagram: fit-screen scales both
  axes so the complete diagram is visible on one screen; zoom and scrollbars
  handle the details. The card's SVG is cloned, so the inline view is untouched.
  Both the card canvas and the viewer body use start-aligned flex with
  `margin: auto` on the SVG rather than flex centering, because a centered
  overflowing child puts its top/left edge beyond the scroll origin and makes the
  start of a zoomed diagram unreachable. The panel itself is **resizable**: drag
  any edge or corner (all eight handles resize; a small grip mark sits in the
  bottom-right corner); the panel is pinned where it was and grows toward the
  dragged edge, clamped to 420×300 px minimum and 98vw×98vh maximum. The overlay
  only keeps a 1vw/1vh gap to the window edges. Double-clicking the title bar
  toggles between filling that area and the size from before; the chosen size is
  stored in `localStorage` and reopened at that size, and the zoom preset
  re-fits while resizing. On Windows the native caption buttons (minimize /
  maximize / close) are a Window Controls Overlay painted by Electron above the
  page — no CSS can cover them — so the overlay reserves the same top clearance
  DSH uses for its own overlays (`--dsh-frame-top-clearance`) and the panel never
  starts under that row. The toolbar controls are centered in the bar (the
  diagram type stays on the left), which keeps them away from the top-right
  native buttons even when the panel is nearly full screen.

### Saving images

The save button clones the rendered SVG with an explicit `xmlns`, `viewBox` and
size. Chromium **taints a canvas** when an SVG image contains `<foreignObject>`
HTML — `toBlob` then throws "Tainted canvases may not be exported", which broke
PNG export for flowcharts (Mermaid puts HTML node labels in foreignObject).
The export copy therefore **replaces every foreignObject label with a plain SVG
`<text>`**, built from the label's rendered lines, computed font and color, and
its user-space box; the live card keeps its HTML labels. The flattened copy is
loaded as an `<img>` and drawn to a 2× canvas padded with 24 px of the card
background before PNG encoding, so the SVG's own `<style>` (arrows, rounded
nodes, filters) survives. The filename is `mermaid-<type>-<timestamp>.png`.

Saving goes through the DSH `fileActions` service when available: a `read`
callback hands over the PNG blob, `canSaveAs` selects Desktop's native *Save as*
dialog versus a Web download, `cancelled` produces no toast, and `saved` /
`requested` show *image saved* / *download started*. Without the service the
plugin falls back to an anchor download. A failing export shows *could not save
the image* and logs the error instead of disturbing the diagram.

### Lazy rendering

Rendering a diagram means Mermaid parsing/layout plus the contrast audit, and a
long chat can hold dozens of them. The plugin therefore only renders a block when
it comes within 400 px of the viewport:

- The block keeps its **native code block** while deferred — nothing is created,
  measured or laid out yet, so there is no placeholder height to guess.
- An `IntersectionObserver` (400 px margin) is the primary trigger. Because
  intersection callbacks pause while the desktop window is occluded or the
  renderer is throttled, a geometry check on scroll/resize and a short poll act
  as a fallback, so a block still renders when it becomes visible either way.
- Once rendered, a diagram stays rendered (scrolling away does not recycle it).
- A theme switch re-renders the diagrams that are already on screen; deferred
  blocks render with the current theme when they are activated later.

### How it works

The Web UI renders Markdown through shared primitives inside its shell bundle.
The code-block component (`md-code-block` wrapper with `data-code-block-banner` /
`data-code-block-content` children) is not exposed as a slot or a renderer
registry, so there is no official seat to plug a diagram renderer into. The
plugin observes the rendered DOM with a debounced `MutationObserver`, recognizes
Mermaid fences, and layers its figure next to the native code block. It never
reads or mutates another plugin's styles or components.

A fence is recognized by its banner language when that is `mermaid`, and
otherwise by content: a banner that is a concrete language (`bash`, `python`, …)
opts the block out; a generic localized label (`代码块` / `Code block`) leaves the
decision to the first diagram line (`flowchart`, `sequenceDiagram`,
`classDiagram`, `gantt`, …). A block whose code does not parse is restored
untouched.

## Repository layout

| Path | Role |
| --- | --- |
| `package.json` | The npm package and DSH bundle manifest (`dsh.bundle.patch`, `dsh.client`, `files`, scripts). |
| `cordis.patch.yml` | Loader patch that inserts the `cyua-mermaid-render` row. |
| `index.js` | Host half (empty `apply`): the plugin only needs the bundle row. |
| `src/client.js` | Client-half source: detection, render queue, figure UI, contrast repair, full-screen viewer, i18n. |
| `build.mjs` | esbuild pipeline: bundles Mermaid + source into `dist/client.js` in the DSH module-loader format. |
| `dist/client.js` | Built Client module (generated, git-ignored, published). |
| `locale/*.json` | Localized plugin title/description for the plugin list. |
| `icon.svg` | Plugin icon for the plugin list. |
| `tools/check-release.mjs` | Release artifact check used by `npm run verify`. |
| `dev/verification/` | Local verification harness (report server + observer plugin), not published. |

## Verification

Verified in the running Web UI by loading the real plugin into the app page and
driving it with a temporary observer plugin that injected known diagram sources
off-screen, then reading back the figure chrome and auditing the rendered SVG
(per-text contrast against the surface actually behind it), all on the release
build in the dark theme:

| Case | Result |
| --- | --- |
| Sequence with `rect rgb(255,247,230)` band, note, `alt` | 18 labels, min contrast **11.75**, 0 failures |
| State / class / flowchart / pie | 4–9 labels, min contrast 9.25–15.03, 0 failures |
| Large 6-participant sequence | inline 850×640 inside a 898 px canvas (true fit, no horizontal scrollbar); full screen fit 70%, zoom to 110% with scroll reach to the first row, `Esc` restores the page scroll |
| Subgraph colors | 3-subgraph flowchart → blue/amber/purple in reading order; a `style GROUP fill:` cluster keeps its written color |
| Participant colors | 4- and 7-participant sequences: actor boxes, stick figure and labels get distinct hues left-to-right (blue, purple, pink, red, amber, green, teal) |
| Figure chrome | type label, copy/fit/full-screen/source buttons, 34 px toolbar, 16 px radius, rounded shapes (`rx: 9px`), soft drop shadow |
| Lazy rendering | a block parked far from the viewport keeps its native code block (no figure, no hidden content); moving it within 400 px renders the figure to `ready` and hides the code block; both the `IntersectionObserver` path and the geometry fallback (`source=io` / `source=proximity`) were observed activating blocks |
| Viewer resize | 1602×974 default panel with **8** grips and the caption row reserved (window 1920×1032, caption clearance 40 px, overlay top padding 50 px); corner drag −160×−100 shrinks to 1444×884; left-edge drag widens; bottom-left drag reaches the window padding; **double-click on the bar** fills to 1884×974 and a second double-click restores the previous size; dragging the top edge stops at `top=50` (never under the native buttons); toolbar controls are centered in the bar (offset 3 px) with 826 px to the right edge; the size is stored and reopened |
| Image export | a 662×289 sequence diagram rasterizes to 1420×674 PNG (50,117 bytes) and a 418×330 flowchart with **5** `foreignObject` HTML labels rasterizes to 932×756 PNG (105,680 bytes) after the labels are flattened to SVG text; clicking the toolbar button opens the Desktop native save dialog (`mode=saveAs`, cancel returns `cancelled`, no toast) and the fallback anchor download is used when `fileActions` is absent |

Known verification limits: the live checks were run in the dark theme; the light
palette goes through the same token path but was not re-audited.

## Known limits

- **Bundle size.** Mermaid is bundled into the Client module (~5.4 MB), so the
  plugin is self-contained; the module is evaluated at page boot.
- **DOM coupling.** The code-block markup and the Client services used here are
  internal to DSH, not a public plugin API.
- **Source colors can be re-tinted.** A fill that cannot carry the theme text is
  moved to the theme's lightness (hue preserved); fills that already read well are
  left alone.
- **Mermaid `box` groups** cannot contain messages in Mermaid 12 (upstream parser
  behavior); only participant declarations belong in a `box`.
- **Lazy rendering** shows the native code block for blocks more than 400 px away;
  scrolling faster than a render can finish may briefly show the code block before
  the diagram replaces it. Blocks far from the viewport are not rendered, so a
  full-page capture taken without scrolling shows them as code.
- **Windows caption buttons** belong to Electron's Window Controls Overlay and are
  painted by the OS above every page element; the viewer reserves their row
  instead of trying to cover it. Other overlays the plugin draws (toolbar, pills)
  are normal page content.
- **Full-screen zoom** is button/keyboard driven; wheel zoom and drag-to-pan are
  not implemented (panning uses the overlay's scrollbars).

## License

MIT. Mermaid is bundled under its own MIT license — see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
