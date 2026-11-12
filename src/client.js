/**
 * Mermaid diagrams for DSH chat code blocks.
 *
 * The Web UI renders Markdown through shared primitives that expose no
 * extension point for a fenced code block, so this plugin works on the
 * rendered DOM instead. A fenced ```mermaid block produces
 *
 *   <div class="md-code-block">
 *     <div …><div data-code-block-banner>…</div>…</div>
 *     <div data-code-block-content>…highlighted <pre>…</div>
 *   </div>
 *
 * The plugin watches for those blocks, renders the fence text with Mermaid
 * into an inline SVG, hides the native code body while the diagram is shown,
 * and keeps the original source one click away.
 */
import mermaid from 'mermaid'

const NS = 'dsh-mermaid'

/** Attributes this plugin owns on a `.md-code-block` wrapper. */
const ATTR_DIAGRAM = 'data-dsh-mermaid'
const ATTR_SOURCE = 'data-dsh-mermaid-source'
const ATTR_FIGURE = 'data-dsh-mermaid-figure'
const ATTR_HIDE = 'data-dsh-mermaid-hide'

const CONTENT_SELECTOR = '[data-code-block-content]'
const BANNER_SELECTOR = '[data-code-block-banner]'

/**
 * Development-only verification sink: `__DSH_MERMAID_DEBUG__` and
 * `__DSH_MERMAID_REPORT__` are replaced at build time, so the release bundle
 * drops the reporter and every guarded call site.
 */
function report(event, detail) {
  if (!__DSH_MERMAID_DEBUG__) return
  try {
    fetch(__DSH_MERMAID_REPORT__, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      body: JSON.stringify({ event, at: Date.now(), ...detail }),
    })
  } catch {
    /* never let diagnostics break rendering */
  }
}

const EN_DICT = {
  brand: 'Mermaid',
  viewSource: 'View source',
  viewDiagram: 'View diagram',
  copySource: 'Copy source',
  copied: 'Copied',
  fitWidth: 'Fit width',
  naturalSize: 'Actual size',
  expand: 'Open full screen',
  close: 'Close',
  fitScreen: 'Fit screen',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  rendering: 'Rendering diagram…',
  typeSequence: 'Sequence diagram',
  typeFlowchart: 'Flowchart',
  typeClass: 'Class diagram',
  typeState: 'State diagram',
  typeEr: 'ER diagram',
  typeGantt: 'Gantt chart',
  typePie: 'Pie chart',
  typeMindmap: 'Mindmap',
  typeTimeline: 'Timeline',
  typeGit: 'Git graph',
  typeJourney: 'User journey',
  typeRequirement: 'Requirement diagram',
  typeQuadrant: 'Quadrant chart',
  typeXychart: 'XY chart',
  typeBlock: 'Block diagram',
  typePacket: 'Packet diagram',
  typeKanban: 'Kanban',
  typeC4: 'C4 diagram',
  typeArchitecture: 'Architecture',
  typeSankey: 'Sankey diagram',
  typeRadar: 'Radar chart',
  typeTreemap: 'Treemap',
  typeVenn: 'Venn diagram',
  typeIshikawa: 'Ishikawa diagram',
  typeDiagram: 'Diagram',
}
const ZH_DICT = {
  brand: 'Mermaid',
  viewSource: '查看源码',
  viewDiagram: '查看图表',
  copySource: '复制源码',
  copied: '已复制',
  fitWidth: '适应宽度',
  naturalSize: '原始大小',
  expand: '全屏查看',
  close: '关闭',
  fitScreen: '适应屏幕',
  zoomIn: '放大',
  zoomOut: '缩小',
  rendering: '正在渲染图表…',
  typeSequence: '时序图',
  typeFlowchart: '流程图',
  typeClass: '类图',
  typeState: '状态图',
  typeEr: 'ER 图',
  typeGantt: '甘特图',
  typePie: '饼图',
  typeMindmap: '思维导图',
  typeTimeline: '时间线',
  typeGit: 'Git 图',
  typeJourney: '用户旅程',
  typeRequirement: '需求图',
  typeQuadrant: '象限图',
  typeXychart: 'XY 图',
  typeBlock: '块图',
  typePacket: '数据包图',
  typeKanban: '看板',
  typeC4: 'C4 架构图',
  typeArchitecture: '架构图',
  typeSankey: '桑基图',
  typeRadar: '雷达图',
  typeTreemap: '树状图',
  typeVenn: '维恩图',
  typeIshikawa: '鱼骨图',
  typeDiagram: '图表',
}

/** Inline icons: the toolbar stays icon-only and inherits the theme's ink. */
const BRAND_ICON =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.7 2.6 1.9 5.4v5.2l2.8 2.8h6.6l2.8-2.8V5.4L11.3 2.6z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" opacity=".55"/><circle cx="5.5" cy="6" r="1.1" fill="currentColor"/><circle cx="10.5" cy="6" r="1.1" fill="currentColor"/><circle cx="8" cy="10.2" r="1.1" fill="currentColor"/></svg>'
const ICON_SOURCE =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M5.7 4.5 2.3 8l3.4 3.5M10.3 4.5 13.7 8l-3.4 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ICON_DIAGRAM =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="3.1" width="12" height="9.8" rx="2.6" stroke="currentColor" stroke-width="1.3"/><path d="m4.4 11.4 2.7-3.7 1.9 2.2 1.4-1.6 2.2 3.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5.6" cy="5.9" r=".85" fill="currentColor"/></svg>'
const ICON_COPY =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.6" y="5.6" width="7.8" height="7.8" rx="1.9" stroke="currentColor" stroke-width="1.3"/><path d="M10.4 3.1H4.3a1.3 1.3 0 0 0-1.3 1.3v6.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
const ICON_CHECK =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 8.4 3 3.1 6-6.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ICON_FIT =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.9 6.2V4.3a1.4 1.4 0 0 1 1.4-1.4h1.9M13.1 6.2V4.3a1.4 1.4 0 0 0-1.4-1.4H9.8M2.9 9.8v1.9a1.4 1.4 0 0 0 1.4 1.4h1.9M13.1 9.8v1.9a1.4 1.4 0 0 1-1.4 1.4H9.8" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/></svg>'
const ICON_NATURAL =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1.8" stroke="currentColor" stroke-width="1.35"/><rect x="6.2" y="6.2" width="3.6" height="3.6" rx=".7" fill="currentColor" opacity=".55"/></svg>'
const ICON_EXPAND =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9.6 6.4 13.4 2.6M13.4 2.6H10.2M13.4 2.6v3.2M6.4 9.6 2.6 13.4M2.6 13.4h3.2M2.6 13.4V10.2" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const ICON_CLOSE =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4.6 4.6 6.8 6.8M11.4 4.6l-6.8 6.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
const ICON_PLUS =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3.6v8.8M3.6 8h8.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
const ICON_MINUS =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.6 8h8.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
const ICON_FIT_WIDTH =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.3 4.4v7.2M13.7 4.4v7.2M4.7 8h6.6M4.7 8l1.7-1.7M4.7 8l1.7 1.7M11.3 8l-1.7-1.7M11.3 8l-1.7 1.7" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>'

const TYPE_MATCHERS = [
  [/^(?:graph|flowchart)\b/, 'flowchart'],
  [/^sequenceDiagram\b/, 'sequence'],
  [/^classDiagram\b/, 'class'],
  [/^stateDiagram\b/, 'state'],
  [/^erDiagram\b/, 'er'],
  [/^gantt\b/, 'gantt'],
  [/^pie\b/, 'pie'],
  [/^mindmap\b/, 'mindmap'],
  [/^timeline\b/, 'timeline'],
  [/^gitGraph\b/, 'git'],
  [/^journey\b/, 'journey'],
  [/^requirementDiagram\b/, 'requirement'],
  [/^quadrantChart\b/, 'quadrant'],
  [/^xychart\b/, 'xychart'],
  [/^block-beta\b/, 'block'],
  [/^packet-beta\b/, 'packet'],
  [/^kanban\b/, 'kanban'],
  [/^C4/, 'c4'],
  [/^architecture-beta\b/, 'architecture'],
  [/^sankey-beta\b/, 'sankey'],
  [/^radar-beta\b/, 'radar'],
  [/^treemap-beta\b/, 'treemap'],
  [/^venn-beta\b/, 'venn'],
  [/^ishikawa-beta\b/, 'ishikawa'],
]

/**
 * First meaningful line of every diagram type Mermaid detects. Used when the
 * code block shows a generic localized label instead of the fence language.
 */
const STARTERS = [
  'graph', 'flowchart', 'flowchart-elk', 'sequenceDiagram', 'classDiagram',
  'classDiagram-v2', 'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'journey',
  'gantt', 'pie', 'quadrantChart', 'requirementDiagram', 'gitGraph', 'C4Context',
  'C4Container', 'C4Component', 'C4Dynamic', 'C4Deployment', 'mindmap', 'timeline',
  'zenuml', 'sankey-beta', 'xychart-beta', 'block-beta', 'packet-beta', 'kanban',
  'architecture-beta', 'radar-beta', 'treemap-beta', 'swimlanes', 'venn-beta',
  'ishikawa-beta', 'railroad-beta', 'eventmodeling', 'wardley-beta',
]

const CSS = `
[${ATTR_HIDE}] {
  display: none !important;
}
.md-code-block[${ATTR_DIAGRAM}] {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.md-code-block[${ATTR_DIAGRAM}],
.md-code-block[${ATTR_SOURCE}] {
  margin-block: 12px !important;
}
[${ATTR_FIGURE}] {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  margin: 12px 0 6px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.07));
  border-radius: var(--dsw-radius-lg, 14px);
  corner-shape: var(--dsw-corner-shape, round);
  background: var(--dsw-alias-bg-layer-1, #232324);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.035);
  color: var(--dsw-alias-label-secondary, inherit);
  font-size: 12px;
  line-height: 18px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
[${ATTR_FIGURE}]::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.028), rgba(255, 255, 255, 0) 46%);
  pointer-events: none;
}
[${ATTR_FIGURE}]:hover {
  border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
[${ATTR_FIGURE}] .dsh-mermaid-bar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  box-sizing: border-box;
  min-height: 34px;
  padding: 3px 7px 3px 13px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
}
[${ATTR_FIGURE}][data-source] .dsh-mermaid-bar {
  border-bottom-color: transparent;
}
[${ATTR_FIGURE}] .dsh-mermaid-brand {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--dsw-alias-label-secondary, inherit);
}
[${ATTR_FIGURE}] .dsh-mermaid-brand svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  opacity: 0.92;
}
[${ATTR_FIGURE}] .dsh-mermaid-type {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
[${ATTR_FIGURE}] .dsh-mermaid-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  opacity: 0.78;
  transition: opacity 0.18s ease;
}
[${ATTR_FIGURE}]:hover .dsh-mermaid-actions,
[${ATTR_FIGURE}] .dsh-mermaid-actions:focus-within {
  opacity: 1;
}
[${ATTR_FIGURE}] .dsh-mermaid-action {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 27px;
  height: 27px;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm, 8px);
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
[${ATTR_FIGURE}] .dsh-mermaid-action:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
  color: var(--dsw-alias-label-primary, inherit);
}
[${ATTR_FIGURE}] .dsh-mermaid-action:active {
  background: var(--dsw-alias-interactive-bg-active, rgba(255, 255, 255, 0.14));
}
[${ATTR_FIGURE}] .dsh-mermaid-action:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, currentColor);
  outline-offset: 1px;
}
[${ATTR_FIGURE}] .dsh-mermaid-action[hidden] {
  display: none !important;
}
[${ATTR_FIGURE}] .dsh-mermaid-action[aria-pressed='true'] {
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
}
[${ATTR_FIGURE}] .dsh-mermaid-action.is-success {
  color: var(--dsw-alias-state-success-primary, #22c55e);
}
[${ATTR_FIGURE}] .dsh-mermaid-action svg {
  width: 15px;
  height: 15px;
}
[${ATTR_FIGURE}] .dsh-mermaid-canvas {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  box-sizing: border-box;
  overflow: auto;
  max-height: min(72vh, 720px);
  padding: 22px 24px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2, rgba(255, 255, 255, 0.18)) transparent;
}
[${ATTR_FIGURE}][data-state='pending'] .dsh-mermaid-canvas {
  justify-content: flex-start;
  padding: 14px 22px;
}
[${ATTR_FIGURE}][data-source] .dsh-mermaid-canvas {
  display: none;
}
[${ATTR_FIGURE}] .dsh-mermaid-canvas[data-overflow='x'] {
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%);
}
[${ATTR_FIGURE}] .dsh-mermaid-canvas[data-overflow-y='y'] {
  -webkit-mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - 18px), transparent 100%);
  mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - 18px), transparent 100%);
}
[${ATTR_FIGURE}][data-tall] .dsh-mermaid-canvas {
  padding-bottom: 52px;
}
[${ATTR_FIGURE}] .dsh-mermaid-tall-hint {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 2;
  display: none;
  align-items: center;
  gap: 6px;
  padding: 5px 13px 5px 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2, #2c2c2e);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.32);
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  font-size: 11.5px;
  line-height: 16px;
  cursor: pointer;
  transform: translateX(-50%);
  opacity: 0.92;
  transition: background 0.15s ease, opacity 0.15s ease;
}
[${ATTR_FIGURE}] .dsh-mermaid-tall-hint svg {
  width: 13px;
  height: 13px;
}
[${ATTR_FIGURE}] .dsh-mermaid-tall-hint:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.14));
  opacity: 1;
}
[${ATTR_FIGURE}][data-tall]:not([data-source]) .dsh-mermaid-tall-hint {
  display: inline-flex;
}
[${ATTR_FIGURE}] .dsh-mermaid-canvas > svg {
  display: block;
  flex: 0 0 auto;
  margin: auto;
  max-width: 100%;
  height: auto;
  opacity: 0;
}
[${ATTR_FIGURE}][data-state='ready'] .dsh-mermaid-canvas > svg {
  opacity: 1;
  animation: dsh-mermaid-reveal 0.22s ease both;
}
@keyframes dsh-mermaid-reveal {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  [${ATTR_FIGURE}][data-state='ready'] .dsh-mermaid-canvas > svg {
    animation: none;
  }
}
[${ATTR_FIGURE}] .dsh-mermaid-pending {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--dsw-alias-label-secondary, inherit);
  opacity: 0.8;
}
[${ATTR_FIGURE}] .dsh-mermaid-pending::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  border-right-color: transparent;
  animation: dsh-mermaid-spin 0.9s linear infinite;
}
@keyframes dsh-mermaid-spin {
  to {
    transform: rotate(360deg);
  }
}

.dsh-mermaid-viewer {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3vh 3vw;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.62));
  backdrop-filter: blur(6px);
  animation: dsh-mermaid-viewer-in 0.16s ease both;
}
.dsh-mermaid-viewer-panel {
  display: flex;
  flex-direction: column;
  width: min(1600px, 94vw);
  height: min(980px, 94vh);
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  border-radius: var(--dsw-radius-lg, 16px);
  background: var(--dsw-alias-bg-layer-1, #232324);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  animation: dsh-mermaid-panel-in 0.18s ease both;
}
.dsh-mermaid-viewer-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 6px 8px 6px 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.06));
}
.dsh-mermaid-viewer .dsh-mermaid-brand svg {
  width: 16px;
  height: 16px;
}
.dsh-mermaid-viewer-controls {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}
.dsh-mermaid-viewer .dsh-mermaid-action {
  width: 28px;
  height: 28px;
}
.dsh-mermaid-viewer-zoom {
  min-width: 44px;
  text-align: center;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary, inherit);
}
.dsh-mermaid-viewer-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  overflow: auto;
  padding: 24px;
  background: var(--dsw-alias-bg-base, #151517);
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2, rgba(255, 255, 255, 0.18)) transparent;
}
.dsh-mermaid-viewer-body > svg {
  display: block;
  flex: 0 0 auto;
  margin: auto;
  max-width: none;
  height: auto;
}
@keyframes dsh-mermaid-viewer-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes dsh-mermaid-panel-in {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.995);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-mermaid-viewer,
  .dsh-mermaid-viewer-panel {
    animation: none;
  }
}
`

/** i18n key for a detected diagram type. */
function typeLabelKey(type) {
  return 'type' + type.charAt(0).toUpperCase() + type.slice(1)
}

/** First meaningful code line, skipping front matter and `%%` comments. */
function firstMeaningfulLine(code) {
  let text = String(code || '').replace(/^\uFEFF/, '').trimStart()
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3)
    if (end !== -1) text = text.slice(end + 4)
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('%%')) continue
    return line
  }
  return ''
}

/** Diagram family shown in the figure's toolbar. */
function diagramType(code) {
  const line = firstMeaningfulLine(code)
  for (const [pattern, type] of TYPE_MATCHERS) {
    if (pattern.test(line)) return type
  }
  return 'diagram'
}

function iconButton(icon, label, onClick) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'dsh-mermaid-action'
  button.innerHTML = icon
  button.setAttribute('aria-label', label)
  button.title = label
  button.addEventListener('click', onClick)
  return button
}

async function copyText(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

function apply(ctx) {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return

  const state = {
    ctx,
    t: createTranslator(ctx),
    records: new Map(),
    scanTimer: 0,
    queue: Promise.resolve(),
    seq: 0,
    initKey: '',
    disposed: false,
    scanSignature: '',
    palette: null,
    viewer: null,
  }

  const style = document.createElement('style')
  style.setAttribute('data-dsh-mermaid-style', '')
  style.textContent = CSS
  document.head.appendChild(style)

  // A previous generation that was torn down without cleanup cannot leave
  // stale figures or hidden code behind.
  sweepStale()

  const observer = new MutationObserver(() => scheduleScan(state))
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })

  const offTheme = ctx.on('theme/change', () => rerenderAll(state))
  const offLocale = ctx.on('locale/change', () => {
    for (const [block, record] of state.records) {
      if (block.isConnected && record.figure) updateLabels(state, record)
    }
  })

  ctx.effect(() => {
    return () => {
      state.disposed = true
      observer.disconnect()
      if (state.scanTimer) clearTimeout(state.scanTimer)
      offTheme()
      offLocale()
      for (const [block, record] of state.records) {
        cleanupRecord(record)
        if (block.isConnected) teardownBlock(block, record)
      }
      state.records.clear()
      sweepStale()
      closeViewer(state)
      style.remove()
      if (__DSH_MERMAID_DEBUG__) {
        report('dispose', {
          figuresLeft: document.querySelectorAll('[' + ATTR_FIGURE + ']').length,
          hiddenLeft: document.querySelectorAll('[' + ATTR_HIDE + ']').length,
          appliedLeft: document.querySelectorAll('.md-code-block[' + ATTR_DIAGRAM + ']').length,
        })
      }
    }
  }, 'mermaid diagram renderer')

  scheduleScan(state, 0)
  if (__DSH_MERMAID_DEBUG__) {
    report('apply', {
      theme: hasService(ctx, 'theme'),
      locale: hasService(ctx, 'locale'),
      scheme: currentColorScheme(ctx),
      ua: typeof navigator === 'undefined' ? '' : String(navigator.userAgent).slice(0, 120),
    })
  }
}

function hasService(ctx, name) {
  try {
    return Boolean(ctx.get(name))
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* scanning and detection                                              */
/* ------------------------------------------------------------------ */

function scheduleScan(state, delay = 140) {
  if (state.disposed || state.scanTimer) return
  state.scanTimer = setTimeout(() => {
    state.scanTimer = 0
    if (!state.disposed) scan(state)
  }, delay)
}

function scan(state) {
  const blocks = document.querySelectorAll('.md-code-block')
  for (const block of blocks) syncBlock(state, block)
  for (const [block, record] of state.records) {
    if (!block.isConnected) {
      cleanupRecord(record)
      state.records.delete(block)
    }
  }
  if (__DSH_MERMAID_DEBUG__) {
    const signature = blocks.length + '/' + state.records.size
    if (signature !== state.scanSignature) {
      state.scanSignature = signature
      const first = blocks[0]
      report('scan', {
        blocks: blocks.length,
        fences: state.records.size,
        statuses: [...state.records.values()].map((r) => r.status).join(','),
        firstBanner: first ? bannerText(first).slice(0, 40) : '',
        firstContent: first ? contentShape(first) : '',
      })
    }
  }
}

function syncBlock(state, block) {
  const detection = detect(block)
  const existing = state.records.get(block)

  if (detection === null) {
    if (existing) {
      teardownBlock(block, existing)
      state.records.delete(block)
    }
    return
  }

  const record = existing || createRecord(block)
  if (!existing) state.records.set(block, record)

  if (record.code === detection.code) {
    // A settled failure keeps the plain code block until the fence changes.
    if (record.status === 'error') {
      showSiblings(block)
      return
    }
    if (!record.figure) ensureFigure(state, block, record)
    else if (!record.figure.isConnected) block.appendChild(record.figure)
    if (!record.sourceMode) hideSiblings(block)
    if (record.attempts > 0 && record.status === 'pending' && !record.timer && !record.rendering) {
      scheduleRender(state, record, retryDelay(record))
    }
    return
  }

  record.code = detection.code
  record.type = diagramType(detection.code)
  record.attempts = 0
  if (__DSH_MERMAID_DEBUG__) {
    report('fence', {
      language: detection.language,
      codeLen: detection.code.length,
      head: detection.code.trim().slice(0, 80),
    })
  }
  record.status = 'pending'
  ensureFigure(state, block, record)
  setFigureState(record, 'pending')
  setStatusText(record, '')
  applyDiagramMode(state, block, record)
  scheduleRender(state, record, record.lastRendered ? 140 : 240)
}

/** Returns `{ content, code, language }` when the block holds a Mermaid fence. */
function detect(block) {
  const content = block.querySelector(':scope > ' + CONTENT_SELECTOR) || block.querySelector(CONTENT_SELECTOR)
  if (!content) return null
  const code = content.textContent || ''
  if (!code.trim()) return null

  const language = bannerText(block).trim()
  if (/^mermaid$/i.test(language)) return { content, code, language }
  // A bare ASCII word is a concrete fence language (`bash`, `python`, `json`…).
  // Anything else — an empty banner or a localized generic label such as
  // "代码块" / "Code block" — leaves the language open, so the content decides.
  if (language && /^[A-Za-z0-9_+.#-]+$/.test(language) && !/^code$/i.test(language)) return null
  return looksLikeMermaid(code) ? { content, code, language } : null
}

function bannerText(block) {
  const banner = block.querySelector(BANNER_SELECTOR)
  if (!banner) return ''
  let node = banner.firstElementChild
  while (node && node.firstElementChild) node = node.firstElementChild
  return (node && node.textContent) || ''
}

function looksLikeMermaid(raw) {
  let text = raw.replace(/^\uFEFF/, '').trimStart()
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3)
    if (end !== -1) text = text.slice(end + 4)
  }
  let examined = 0
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('%%')) continue
    if (++examined > 4) break
    for (const starter of STARTERS) {
      if (!line.startsWith(starter)) continue
      if (line === starter || /^[\s;{(<]/.test(line.slice(starter.length))) return true
    }
  }
  return false
}

/* ------------------------------------------------------------------ */
/* rendering                                                           */
/* ------------------------------------------------------------------ */

function scheduleRender(state, record, delay) {
  if (state.disposed || record.timer || record.rendering) return
  record.timer = setTimeout(() => {
    record.timer = 0
    enqueue(state, () => renderRecord(state, record))
  }, delay)
}

function enqueue(state, task) {
  state.queue = state.queue.then(task).catch((error) => {
    console.error('[dsh-mermaid]', error)
  })
}

function retryDelay(record) {
  return Math.min(500 * 2 ** Math.max(0, record.attempts - 1), 4000)
}

function currentThemeInfo(ctx) {
  const scheme = currentColorScheme(ctx)
  let revision = 0
  try {
    const theme = ctx.get('theme')
    const snapshot = theme && typeof theme.getTheme === 'function' ? theme.getTheme() : undefined
    if (snapshot && typeof snapshot.revision === 'number') revision = snapshot.revision
  } catch {
    /* revision stays 0 */
  }
  return { scheme, revision }
}

function configureMermaid(state) {
  const { scheme, revision } = currentThemeInfo(state.ctx)
  const fontFamily = currentFontFamily()
  const key = scheme + '|' + revision + '|' + fontFamily
  if (key === state.initKey) return
  const tokens = resolveTokens(scheme)
  state.palette = tokens
  const shadow = tokens.dark
    ? 'drop-shadow(0 10px 24px rgba(0, 0, 0, 0.45))'
    : 'drop-shadow(0 8px 20px rgba(15, 23, 42, 0.12))'
  const variables = buildThemeVariables(tokens, fontFamily)
  variables.dropShadow = shadow
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    // The "neo" look already ships rounded actor boxes, soft bands and better
    // spacing than the classic renderer; combined with the token palette it
    // reads as part of the app instead of as a pasted diagram.
    look: 'neo',
    themeVariables: variables,
    fontFamily,
    htmlLabels: true,
    logLevel: 'fatal',
    deterministicIds: false,
    suppressErrorRendering: true,
    themeCSS: `
      svg { background: transparent !important; }
      rect.actor[data-look='neo'], rect.note[data-look='neo'], .labelBox, g rect.rect,
      [data-look='neo'].node rect, [data-look='neo'].cluster rect, [data-look='neo'].node polygon {
        filter: ${shadow};
      }
      rect.actor, rect.note, rect.label-container, rect.rect, .labelBox > rect, .loopLine {
        rx: 9px;
        ry: 9px;
      }
      .actor { stroke-width: 0.9px; }
      .messageText, .loopText, .labelText, .noteText, .actor > tspan { letter-spacing: 0.01em; }
      .messageLine0, .messageLine1 { stroke-width: 1.1px; }
    `,
    sequence: { useMaxWidth: false, boxMargin: 12, actorMargin: 56, noteMargin: 12, messageMargin: 42, mirrorActors: false },
    flowchart: { useMaxWidth: false, curve: 'basis', nodeSpacing: 34, rankSpacing: 46, padding: 14 },
    gantt: { useMaxWidth: false, barHeight: 26, barGap: 6, topPadding: 52 },
    class: { useMaxWidth: false },
    state: { useMaxWidth: false },
    er: { useMaxWidth: false },
  })
  state.initKey = key
}

/** Below this scale an inline diagram is too small to read comfortably. */
const INLINE_READABLE_SCALE = 0.62

/**
 * Fit the diagram into the card. `fit` means the card's *width* is actually
 * respected: the SVG is scaled down until it fits horizontally, and small
 * diagrams keep their natural size (no blurry upscaling). Wide diagrams are not
 * held back at a readability floor — the full-screen viewer is where the user
 * zooms for detail. `mode: 'natural'` renders at 100%.
 */
function applySvgSizing(svgElement, canvas, mode = 'fit') {
  if (!svgElement || !canvas) return null
  try {
    const box = svgElement.viewBox && svgElement.viewBox.baseVal
    const naturalWidth = box && box.width ? box.width : svgElement.getBoundingClientRect().width
    if (!naturalWidth) return null
    const styles = getComputedStyle(canvas)
    const padding = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0)
    const hostWidth = canvas.clientWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 0)
    const available = Math.max(120, hostWidth - padding)
    const fitScale = Math.min(1, available / naturalWidth)
    const scale = mode === 'natural' ? 1 : fitScale
    const width = Math.round(naturalWidth * scale)
    svgElement.removeAttribute('height')
    svgElement.removeAttribute('width')
    svgElement.style.maxWidth = 'none'
    svgElement.style.width = width + 'px'
    svgElement.style.height = 'auto'
    svgElement.style.display = 'block'
    svgElement.style.flex = '0 0 auto'
    const overflowing = width > available + 1
    canvas.setAttribute('data-overflow', overflowing ? 'x' : '')
    let tall = false
    try {
      const canvasStyles = getComputedStyle(canvas)
      const paddingY = (parseFloat(canvasStyles.paddingTop) || 0) + (parseFloat(canvasStyles.paddingBottom) || 0)
      const viewport = canvas.clientHeight - paddingY
      tall = svgElement.getBoundingClientRect().height > viewport + 4
    } catch {
      tall = false
    }
    canvas.setAttribute('data-overflow-y', tall ? 'y' : '')
    return {
      naturalWidth,
      available,
      width,
      scale,
      overflowing,
      tall,
      // Either dimension can make the inline card a poor place to read the
      // diagram; both cases get the "open full screen" affordance.
      needsHint: tall || scale < INLINE_READABLE_SCALE,
      fitsNaturally: naturalWidth <= available + 24,
    }
  } catch {
    return null
  }
}

/** DSH design token, resolved from the live page so the diagram matches the theme. */
function readTokenColor(name, fallback) {
  try {
    // Theme aliases are declared below the document root (the app sets them on
    // the body/root subtree), so read an element that actually inherits them.
    const body = document.body
    if (body) {
      const value = getComputedStyle(body).getPropertyValue(name).trim()
      if (value) return value
    }
    const rootValue = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return rootValue || fallback
  } catch {
    return fallback
  }
}

function withAlpha(color, alpha) {
  const value = String(color).trim()
  let match = /^#([0-9a-f]{3})$/i.exec(value)
  if (match) {
    const [r, g, b] = match[1].split('').map((c) => parseInt(c + c, 16))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  match = /^#([0-9a-f]{6})$/i.exec(value)
  if (match) {
    const n = parseInt(match[1], 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
  }
  match = /^rgba?\(([^)]+)\)$/i.exec(value)
  if (match) {
    const parts = match[1].split(',').map((part) => part.trim())
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`
  }
  return `rgba(128, 128, 128, ${alpha})`
}

/** Every color mermaid needs, resolved once per theme change. */
function resolveTokens(scheme) {
  const dark = scheme === 'dark'
  const raw = {
    dark,
    bgBase: readTokenColor('--dsw-alias-bg-base', dark ? '#0e1116' : '#ffffff'),
    bg1: readTokenColor('--dsw-alias-bg-layer-1', dark ? '#171a1f' : '#f7f8fa'),
    bg2: readTokenColor('--dsw-alias-bg-layer-2', dark ? '#21252c' : '#eef0f4'),
    border1: readTokenColor('--dsw-alias-border-l1', dark ? '#2a2f38' : '#dfe3e9'),
    border2: readTokenColor('--dsw-alias-border-l2', dark ? '#3a4150' : '#c6ccd6'),
    fg1: readTokenColor('--dsw-alias-label-primary', dark ? '#e8eaf0' : '#1b1f26'),
    fg2: readTokenColor('--dsw-alias-label-secondary', dark ? '#a6adba' : '#5a6270'),
    brand: readTokenColor('--dsw-alias-brand-primary', dark ? '#5b8def' : '#2f6ff2'),
    accent: readTokenColor('--dsw-alias-link', dark ? '#7aaaff' : '#2563eb'),
    error: readTokenColor('--dsw-alias-state-error-primary', dark ? '#e5534b' : '#c0392b'),
    success: readTokenColor('--dsw-alias-state-success-primary', dark ? '#3fb950' : '#1a7f37'),
    warn: readTokenColor('--dsw-alias-state-warn-primary', dark ? '#d29922' : '#9a6700'),
  }
  // Design tokens may be 8-digit hex or color-mix(); mermaid's own color math
  // expects plain rgb()/rgba(), so normalize every value once here.
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'dark') continue
    raw[key] = normalizeColor(value, dark ? '#e8eaf0' : '#1b1f26')
  }
  return raw
}

function normalizeColor(value, fallback) {
  const parsed = cssColor(value) || cssColor(fallback)
  if (!parsed) return fallback
  const { r, g, b, a } = parsed
  if (a == null || a >= 0.999) return `rgb(${r}, ${g}, ${b})`
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`
}

/**
 * Mermaid's built-in dark theme paints several surfaces with light colors that
 * leave its own light text unreadable (for example sequence `box` groups and
 * `rect` sections). Building the palette from DSH tokens keeps every surface
 * and label on the same contrast scale as the surrounding UI.
 */
function buildThemeVariables(tokens, fontFamily) {
  const { dark, bgBase, bg1, bg2, border1, border2, fg1, fg2, brand, accent, error, success, warn } = tokens

  return {
    darkMode: dark,
    background: 'transparent',
    fontFamily,
    fontSize: '16px',
    // Soft elevation instead of mermaid's hard gray drop shadow.
    dropShadow: dark
      ? 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.42))'
      : 'drop-shadow(0 6px 16px rgba(15, 23, 42, 0.12))',
    // Generic diagram surfaces and labels.
    primaryColor: bg2,
    primaryTextColor: fg1,
    primaryBorderColor: border2,
    secondaryColor: bg1,
    secondaryTextColor: fg1,
    secondaryBorderColor: border1,
    tertiaryColor: bgBase,
    tertiaryTextColor: fg1,
    tertiaryBorderColor: border1,
    textColor: fg1,
    mainBkg: bg2,
    nodeBorder: border2,
    nodeTextColor: fg1,
    titleColor: fg1,
    lineColor: fg2,
    defaultLinkColor: fg2,
    edgeLabelBackground: bg2,
    labelTextColor: fg1,
    clusterBkg: withAlpha(fg1, dark ? 0.05 : 0.035),
    clusterBorder: border1,
    // State / class / ER / note colors.
    labelColor: fg1,
    altBackground: withAlpha(fg1, dark ? 0.04 : 0.03),
    classText: fg1,
    attributeBackgroundColorOdd: withAlpha(fg1, dark ? 0.02 : 0.02),
    attributeBackgroundColorEven: 'transparent',
    // Sequence diagram.
    actorBkg: bg2,
    actorBorder: border2,
    actorTextColor: fg1,
    actorLineColor: border2,
    signalColor: fg2,
    signalTextColor: fg1,
    labelBoxBkgColor: bg2,
    labelBoxBorderColor: border2,
    loopTextColor: fg1,
    noteBkgColor: withAlpha(accent, dark ? 0.16 : 0.1),
    noteBorderColor: withAlpha(accent, 0.5),
    noteTextColor: fg1,
    activationBkgColor: withAlpha(accent, dark ? 0.22 : 0.14),
    activationBorderColor: withAlpha(accent, 0.4),
    sequenceNumberColor: bgBase,
    // Flowchart / gantt / pie accents.
    fillType0: withAlpha(accent, 0.2),
    fillType1: bg2,
    fillType2: bg1,
    fillType3: withAlpha(success, 0.16),
    fillType4: withAlpha(warn, 0.16),
    fillType5: withAlpha(error, 0.16),
    fillType6: withAlpha(fg1, 0.08),
    fillType7: withAlpha(brand, 0.1),
    pie1: withAlpha(brand, 0.85),
    pie2: withAlpha(success, 0.75),
    pie3: withAlpha(warn, 0.75),
    pie4: withAlpha(error, 0.7),
    pie5: withAlpha(fg2, 0.7),
    pie6: withAlpha(brand, 0.55),
    pie7: withAlpha(success, 0.5),
    pie8: withAlpha(fg1, 0.45),
    pieStrokeColor: bgBase,
    pieOuterStrokeColor: border1,
    pieTitleTextColor: fg1,
    pieSectionTextColor: fg1,
    pieLegendTextColor: fg1,
    sectionBkgColor: withAlpha(fg1, dark ? 0.05 : 0.03),
    altSectionBkgColor: 'transparent',
    sectionBkgColor2: withAlpha(fg1, dark ? 0.07 : 0.05),
    taskBkgColor: brand,
    taskBorderColor: brand,
    taskTextColor: fg1,
    taskTextDarkColor: fg1,
    gridColor: border1,
    doneTaskBkgColor: withAlpha(fg2, 0.6),
    doneTaskBorderColor: fg2,
    activeTaskBkgColor: withAlpha(brand, 0.35),
    activeTaskBorderColor: brand,
    critBkgColor: error,
    critBorderColor: error,
    todayLineColor: warn,
  }
}

/* ------------------------------------------------------------------ */
/* contrast repair                                                     */
/* ------------------------------------------------------------------ */

/**
 * Diagram sources carry their own palette (for example `box rgb(236,244,236)`
 * or `rect rgb(...)` sections), which is usually designed against a light
 * canvas and becomes unreadable on a dark card. After rendering, surfaces that
 * cannot carry the theme's ink are re-tinted at the theme's lightness while
 * keeping their hue, and any remaining text is given the best available ink.
 */
const MIN_TEXT_CONTRAST = 3.4
const MIN_SURFACE_CONTRAST = 3.0

function harmonizeSvg(svgElement, palette) {
  const stats = { shapes: 0, repairedShapes: 0, texts: 0, repairedTexts: 0 }
  if (!svgElement || !palette) return stats
  try {
    const figure = svgElement.closest('[' + ATTR_FIGURE + ']')
    const card = resolveCardBackground(figure, palette)
    const shapes = svgElement.querySelectorAll('rect, circle, ellipse, polygon')

    for (const shape of shapes) {
      const fill = cssColor(getComputedStyle(shape).fill)
      if (!fill || fill.a < 0.2) continue
      stats.shapes += 1
      const painted = blend(fill, card)
      if (contrast(painted, tokenRgb(palette.fg1, palette)) >= MIN_SURFACE_CONTRAST) continue
      const fitted = fitSurface(painted, palette.dark)
      shape.style.setProperty('fill', fitted.fill, 'important')
      const stroke = getComputedStyle(shape).stroke
      if (stroke && stroke !== 'none') shape.style.setProperty('stroke', fitted.stroke, 'important')
      stats.repairedShapes += 1
    }

    const surfaces = []
    for (const shape of shapes) {
      const fill = cssColor(getComputedStyle(shape).fill)
      if (!fill || fill.a < 0.2) continue
      surfaces.push({ color: fill, box: shape.getBoundingClientRect() })
    }
    for (const text of svgElement.querySelectorAll('text')) {
      const ink = effectiveInk(text)
      if (!ink) continue
      const box = text.getBoundingClientRect()
      if (!box.width || !box.height) continue
      stats.texts += 1
      const cx = box.left + box.width / 2
      const cy = box.top + box.height / 2
      let background = card
      let smallest = Infinity
      for (const surface of surfaces) {
        const rect = surface.box
        if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) continue
        const area = rect.width * rect.height
        if (area < smallest) {
          smallest = area
          background = blend(surface.color, card)
        }
      }
      if (contrast(ink, background) >= MIN_TEXT_CONTRAST) continue
      const fixed = bestInk(background, palette)
      text.style.setProperty('fill', fixed, 'important')
      for (const tspan of text.querySelectorAll('tspan')) tspan.style.setProperty('fill', fixed, 'important')
      stats.repairedTexts += 1
    }
  } catch {
    /* contrast repair is best-effort and must never break a finished diagram */
  }
  return stats
}

function resolveCardBackground(figure, palette) {
  const fallback = tokenRgb(palette.bg1, palette) || tokenRgb(palette.bgBase, palette)
  if (!figure) return fallback
  const own = cssColor(getComputedStyle(figure).backgroundColor)
  if (own && own.a >= 0.5) return blend(own, tokenRgb(palette.bgBase, palette) || fallback)
  const body = cssColor(getComputedStyle(document.body).backgroundColor)
  if (body && body.a >= 0.5) return body
  return fallback
}

/**
 * Glyphs live in tspans, so the `<text>` element's own fill can differ from
 * what the reader actually sees. Prefer the first tspan's computed fill.
 */
function effectiveInk(text) {
  const tspan = text.querySelector('tspan')
  const style = getComputedStyle(tspan || text)
  return cssColor(style.fill)
}

/** Parse an `rgb()`/`rgba()`/`#rrggbb`/`#rgb` color into channels. */
function cssColor(value) {
  const text = String(value || '').trim()
  const hex = /^#([0-9a-f]{3,8})$/i.exec(text)
  if (hex) {
    const digits = hex[1]
    if (digits.length === 3 || digits.length === 4) {
      const [r, g, b, a] = digits.split('').map((c) => parseInt(c + c, 16))
      return { r, g, b, a: digits.length === 4 ? a / 255 : 1 }
    }
    if (digits.length === 6 || digits.length === 8) {
      const n = parseInt(digits.slice(0, 6), 16)
      return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255,
        a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
      }
    }
    return null
  }
  const match = /^rgba?\(([^)]+)\)$/i.exec(text)
  if (!match) return null
  const parts = match[1].split(/[,/\s]+/).filter(Boolean).map(Number)
  if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1 }
}

function tokenRgb(value, palette) {
  const color = cssColor(value)
  if (color) return color
  return cssColor(palette && palette.dark ? '#e8eaf0' : '#1b1f26')
}

function blend(fg, bg) {
  const alpha = fg.a == null ? 1 : fg.a
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1,
  }
}

function luminance(color) {
  const channel = (value) => {
    const v = value / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
}

function contrast(a, b) {
  const hi = Math.max(luminance(a), luminance(b))
  const lo = Math.min(luminance(a), luminance(b))
  return (hi + 0.05) / (lo + 0.05)
}

function rgbToHsl(color) {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s, l }
}

function hslCss(h, s, l) {
  return `hsl(${h.toFixed(0)} ${(Math.max(0, Math.min(1, s)) * 100).toFixed(0)}% ${(Math.max(0, Math.min(1, l)) * 100).toFixed(0)}%)`
}

function fitSurface(color, dark) {
  const hsl = rgbToHsl(color)
  const saturation = Math.min(hsl.s, 0.5)
  const lightness = dark ? 0.17 : 0.93
  return {
    fill: hslCss(hsl.h, saturation, lightness),
    stroke: hslCss(hsl.h, Math.min(0.55, hsl.s || 0), dark ? 0.4 : 0.66),
  }
}

function bestInk(background, palette) {
  const candidates = [palette.fg1, palette.fg2, palette.bgBase, '#ffffff', '#101318']
  let best = palette.fg1
  let bestRatio = 0
  for (const candidate of candidates) {
    const color = cssColor(candidate)
    if (!color) continue
    const ratio = contrast(color, background)
    if (ratio > bestRatio) {
      bestRatio = ratio
      best = candidate
    }
  }
  return best
}

async function renderRecord(state, record) {
  if (state.disposed || record.rendering) return
  const block = record.block
  if (!block.isConnected) return
  const code = record.code
  const started = Date.now()
  record.rendering = true
  try {
    configureMermaid(state)
    const result = await mermaid.render('dsh-mermaid-' + ++state.seq, code)
    if (state.disposed || !block.isConnected || record.code !== code) return
    if (!result || !result.svg) throw new Error('Mermaid returned no SVG')
    record.canvas.textContent = ''
    record.canvas.insertAdjacentHTML('beforeend', result.svg)
    const svgElement = record.canvas.querySelector('svg')
    record.lastRendered = code
    record.status = 'ready'
    setStatusText(record, '')
    // Settle the card layout first: the pending canvas uses tighter padding, so
    // sizing must be measured against the final padding. The CSS reveal
    // animation starts from the state change itself.
    setFigureState(record, 'ready')
    let sizing = null
    let repair = null
    if (svgElement) {
      sizing = applySvgSizing(svgElement, record.canvas, record.fitMode)
      if (sizing) {
        record.naturalWidth = sizing.naturalWidth
        record.overflowing = sizing.naturalWidth > sizing.available + 24
        record.needsHint = Boolean(sizing.needsHint)
      }
      repair = harmonizeSvg(svgElement, state.palette)
    }
    if (record.figure) record.figure.toggleAttribute('data-tall', Boolean(record.needsHint))
    updateFitButton(state, record)
    applyDiagramMode(state, block, record)
    if (typeof result.bindFunctions === 'function') {
      try {
        result.bindFunctions(record.canvas)
      } catch (error) {
        console.warn('[dsh-mermaid] bindFunctions failed', error)
      }
    }
    if (__DSH_MERMAID_DEBUG__) {
      report('render-ok', {
        codeLen: code.length,
        svgLen: result.svg.length,
        ms: Date.now() - started,
        viewBox: svgElement ? svgElement.getAttribute('viewBox') : null,
        content: contentDisplay(block),
        figure: rectOf(record.figure),
        svg: rectOf(svgElement),
        type: record.type,
        sizing,
        overflow: record.overflowing,
        repair,
      })
      selfTest(block, record)
    }
  } catch (error) {
    if (state.disposed || record.code !== code) return
    record.attempts += 1
    record.lastError = error
    if (__DSH_MERMAID_DEBUG__) {
      report('render-fail', {
        attempt: record.attempts,
        codeLen: code.length,
        message: String((error && error.message) || error).slice(0, 300),
      })
    }
    if (record.attempts <= 6) {
      record.status = 'pending'
      setFigureState(record, 'pending')
      scheduleRender(state, record, retryDelay(record))
    } else {
      // Give up quietly: restore the untouched code block and wait for a new fence.
      record.status = 'error'
      teardownBlock(block, record)
      if (__DSH_MERMAID_DEBUG__) report('render-dead', { message: String((error && error.message) || error).slice(0, 300) })
    }
  } finally {
    record.rendering = false
  }
}

function rerenderAll(state) {
  state.initKey = ''
  for (const [block, record] of state.records) {
    if (!block.isConnected || record.status === 'error') continue
    record.attempts = 0
    record.status = 'pending'
    ensureFigure(state, block, record)
    applyDiagramMode(state, block, record)
    if (record.figure) setFigureState(record, 'pending')
    scheduleRender(state, record, 60)
  }
}

/* ------------------------------------------------------------------ */
/* DOM records                                                         */
/* ------------------------------------------------------------------ */

function createRecord(block) {
  return {
    block,
    code: '',
    type: 'diagram',
    lastRendered: '',
    status: 'pending',
    attempts: 0,
    timer: 0,
    rendering: false,
    sourceMode: false,
    fitMode: 'fit',
    naturalWidth: 0,
    overflowing: false,
    tested: false,
    figure: null,
    canvas: null,
    typeLabel: null,
    statusText: null,
    toggle: null,
    copyButton: null,
    fitButton: null,
    expandButton: null,
    tallHint: null,
    copyTimer: 0,
    pending: null,
    needsHint: false,
  }
}

function ensureFigure(state, block, record) {
  if (record.figure && record.figure.isConnected) return
  if (record.figure) record.figure.remove()

  const figure = document.createElement('div')
  figure.setAttribute(ATTR_FIGURE, '')
  figure.setAttribute('data-state', 'pending')
  figure.setAttribute('role', 'group')

  const bar = document.createElement('div')
  bar.className = 'dsh-mermaid-bar'

  const brand = document.createElement('span')
  brand.className = 'dsh-mermaid-brand'
  brand.innerHTML = BRAND_ICON
  const typeLabel = document.createElement('span')
  typeLabel.className = 'dsh-mermaid-type'
  brand.append(typeLabel)

  const statusText = document.createElement('span')
  statusText.className = 'dsh-mermaid-status'
  statusText.hidden = true

  const actions = document.createElement('div')
  actions.className = 'dsh-mermaid-actions'

  const copyButton = iconButton(ICON_COPY, state.t('copySource'), () => {
    copyText(record.code).then((ok) => {
      if (!ok || !record.copyButton) return
      const button = record.copyButton
      button.innerHTML = ICON_CHECK
      button.classList.add('is-success')
      button.title = state.t('copied')
      button.setAttribute('aria-label', state.t('copied'))
      if (record.copyTimer) clearTimeout(record.copyTimer)
      record.copyTimer = setTimeout(() => {
        record.copyTimer = 0
        if (!record.copyButton) return
        record.copyButton.innerHTML = ICON_COPY
        record.copyButton.classList.remove('is-success')
        record.copyButton.title = state.t('copySource')
        record.copyButton.setAttribute('aria-label', state.t('copySource'))
      }, 1400)
    })
  })

  const fitButton = iconButton(ICON_FIT, state.t('naturalSize'), () => toggleFitMode(state, record))
  fitButton.hidden = true
  fitButton.setAttribute('aria-pressed', 'false')

  const expandButton = iconButton(ICON_EXPAND, state.t('expand'), () => openViewer(state, record))

  const tallHint = document.createElement('button')
  tallHint.type = 'button'
  tallHint.className = 'dsh-mermaid-tall-hint'
  tallHint.innerHTML = ICON_EXPAND + '<span></span>'
  tallHint.addEventListener('click', () => openViewer(state, record))

  const toggle = iconButton(ICON_SOURCE, state.t('viewSource'), () => {
    if (record.sourceMode) applyDiagramMode(state, block, record)
    else applySourceMode(state, block, record)
  })
  toggle.hidden = true

  actions.append(copyButton, fitButton, expandButton, toggle)
  bar.append(brand, statusText, actions)

  const canvas = document.createElement('div')
  canvas.className = 'dsh-mermaid-canvas'
  canvas.addEventListener('dblclick', (event) => {
    if (!record.canvas || !record.canvas.querySelector('svg')) return
    event.preventDefault()
    openViewer(state, record)
  })
  const pending = document.createElement('div')
  pending.className = 'dsh-mermaid-pending'
  canvas.appendChild(pending)

  figure.append(bar, canvas, tallHint)
  block.appendChild(figure)

  record.figure = figure
  record.canvas = canvas
  record.typeLabel = typeLabel
  record.statusText = statusText
  record.toggle = toggle
  record.copyButton = copyButton
  record.fitButton = fitButton
  record.expandButton = expandButton
  record.tallHint = tallHint
  record.pending = pending
  updateLabels(state, record)
}

function toggleFitMode(state, record) {
  record.fitMode = record.fitMode === 'natural' ? 'fit' : 'natural'
  const svg = record.canvas ? record.canvas.querySelector('svg') : null
  if (svg) applySvgSizing(svg, record.canvas, record.fitMode)
  updateFitButton(state, record)
}

function updateFitButton(state, record) {
  if (!record.fitButton) return
  const natural = record.fitMode === 'natural'
  record.fitButton.hidden = !record.overflowing
  record.fitButton.innerHTML = natural ? ICON_NATURAL : ICON_FIT
  record.fitButton.title = natural ? state.t('fitWidth') : state.t('naturalSize')
  record.fitButton.setAttribute('aria-label', record.fitButton.title)
  record.fitButton.setAttribute('aria-pressed', natural ? 'true' : 'false')
}

function updateLabels(state, record) {
  if (!record.figure) return
  const type = record.type || 'diagram'
  const typeName = state.t(typeLabelKey(type))
  if (record.typeLabel) {
    record.typeLabel.textContent = typeName
    record.typeLabel.title = typeName
  }
  const toggle = record.toggle
  if (toggle) {
    const label = record.sourceMode ? state.t('viewDiagram') : state.t('viewSource')
    toggle.innerHTML = record.sourceMode ? ICON_DIAGRAM : ICON_SOURCE
    toggle.title = label
    toggle.setAttribute('aria-label', label)
    toggle.hidden = record.status !== 'ready'
  }
  if (record.copyButton && !record.copyTimer) {
    record.copyButton.innerHTML = ICON_COPY
    record.copyButton.classList.remove('is-success')
    record.copyButton.title = state.t('copySource')
    record.copyButton.setAttribute('aria-label', state.t('copySource'))
  }
  if (record.expandButton) {
    record.expandButton.title = state.t('expand')
    record.expandButton.setAttribute('aria-label', state.t('expand'))
    record.expandButton.hidden = record.status !== 'ready'
  }
  if (record.tallHint) {
    const label = record.tallHint.querySelector('span')
    if (label) label.textContent = state.t('expand')
    record.tallHint.setAttribute('aria-label', state.t('expand'))
    record.tallHint.title = state.t('expand')
    record.tallHint.hidden = record.status !== 'ready' || !record.needsHint || record.sourceMode
  }
  updateFitButton(state, record)
  if (record.pending) record.pending.textContent = state.t('rendering')
  record.figure.setAttribute('aria-label', state.t('brand') + ' · ' + typeName)
}

function setStatusText(record, text) {
  if (!record.statusText) return
  record.statusText.textContent = text || ''
  record.statusText.hidden = !text
}

function setFigureState(record, status) {
  if (record.figure) record.figure.setAttribute('data-state', status)
  if (record.toggle) record.toggle.hidden = status !== 'ready'
  if (status !== 'ready' && record.fitButton) record.fitButton.hidden = true
  if (status !== 'ready' && record.expandButton) record.expandButton.hidden = true
  if (status !== 'ready' && record.tallHint) record.tallHint.hidden = true
}

function applyDiagramMode(state, block, record) {
  const wasSource = record.sourceMode
  record.sourceMode = false
  block.setAttribute(ATTR_DIAGRAM, '')
  block.removeAttribute(ATTR_SOURCE)
  hideSiblings(block)
  if (record.figure) record.figure.removeAttribute('data-source')
  if (record.toggle) record.toggle.hidden = record.status !== 'ready'
  // Coming back from source mode the canvas becomes visible again; re-fit once.
  const svg = wasSource && record.canvas ? record.canvas.querySelector('svg') : null
  if (svg) {
    const sizing = applySvgSizing(svg, record.canvas, record.fitMode)
    if (sizing) {
      record.naturalWidth = sizing.naturalWidth
      record.overflowing = !sizing.fitsNaturally
      record.needsHint = Boolean(sizing.needsHint)
      if (record.figure) record.figure.toggleAttribute('data-tall', Boolean(record.needsHint))
    }
  }
  updateLabels(state, record)
}

function applySourceMode(state, block, record) {
  record.sourceMode = true
  block.removeAttribute(ATTR_DIAGRAM)
  block.setAttribute(ATTR_SOURCE, '')
  showSiblings(block)
  if (record.figure) record.figure.setAttribute('data-source', '')
  if (record.toggle) record.toggle.hidden = false
  updateLabels(state, record)
}

/** Hide the native banner and code body while the diagram is on screen. */
function hideSiblings(block) {
  for (const child of block.children) {
    if (child.hasAttribute(ATTR_FIGURE) || child.hasAttribute(ATTR_HIDE)) continue
    child.setAttribute(ATTR_HIDE, '')
  }
}

function showSiblings(block) {
  for (const child of block.children) {
    if (child.hasAttribute(ATTR_HIDE)) child.removeAttribute(ATTR_HIDE)
  }
}

/* ------------------------------------------------------------------ */
/* full screen viewer                                                  */
/* ------------------------------------------------------------------ */

function viewerButton(icon, label, onClick) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'dsh-mermaid-action'
  button.innerHTML = icon
  button.title = label
  button.setAttribute('aria-label', label)
  button.addEventListener('click', onClick)
  return button
}

/**
 * A tall diagram cannot fit a chat column at a readable size, so the card keeps
 * a bounded, scrollable preview and this overlay shows the whole diagram fitted
 * to the window, with zoom for the details.
 */
function openViewer(state, record) {
  if (typeof document === 'undefined') return
  closeViewer(state)
  const source = record.canvas ? record.canvas.querySelector('svg') : null
  if (!source) return
  const box = source.viewBox && source.viewBox.baseVal
  const naturalWidth = box && box.width ? box.width : source.getBoundingClientRect().width
  const naturalHeight = box && box.height ? box.height : source.getBoundingClientRect().height
  if (!naturalWidth || !naturalHeight) return

  const overlay = document.createElement('div')
  overlay.className = 'dsh-mermaid-viewer'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')

  const panel = document.createElement('div')
  panel.className = 'dsh-mermaid-viewer-panel'

  const bar = document.createElement('div')
  bar.className = 'dsh-mermaid-viewer-bar'
  const brand = document.createElement('span')
  brand.className = 'dsh-mermaid-brand'
  brand.innerHTML = BRAND_ICON
  const title = document.createElement('span')
  title.className = 'dsh-mermaid-type'
  title.textContent = state.t(typeLabelKey(record.type || 'diagram'))
  brand.append(title)

  const zoomLabel = document.createElement('span')
  zoomLabel.className = 'dsh-mermaid-viewer-zoom'

  const controls = document.createElement('div')
  controls.className = 'dsh-mermaid-viewer-controls'
  const zoomOut = viewerButton(ICON_MINUS, state.t('zoomOut'), () => scaleViewerBy(state, 0.8))
  const zoomIn = viewerButton(ICON_PLUS, state.t('zoomIn'), () => scaleViewerBy(state, 1.25))
  const fitScreen = viewerButton(ICON_FIT, state.t('fitScreen'), () => setViewerMode(state, 'fit'))
  const fitWidth = viewerButton(ICON_FIT_WIDTH, state.t('fitWidth'), () => setViewerMode(state, 'width'))
  const actual = viewerButton(ICON_NATURAL, state.t('naturalSize'), () => setViewerMode(state, 'actual'))
  const close = viewerButton(ICON_CLOSE, state.t('close'), () => closeViewer(state))
  controls.append(zoomOut, zoomLabel, zoomIn, fitScreen, fitWidth, actual, close)
  bar.append(brand, controls)

  const body = document.createElement('div')
  body.className = 'dsh-mermaid-viewer-body'
  const svg = source.cloneNode(true)
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.style.maxWidth = 'none'
  svg.style.height = 'auto'
  svg.style.display = 'block'
  svg.style.flex = '0 0 auto'
  body.append(svg)

  panel.append(bar, body)
  overlay.append(panel)
  document.body.appendChild(overlay)

  const previousHtmlOverflow = document.documentElement.style.overflow
  const previousBodyOverflow = document.body.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeViewer(state)
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      scaleViewerBy(state, 1.25)
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      scaleViewerBy(state, 0.8)
    } else if (event.key === '0') {
      event.preventDefault()
      setViewerMode(state, 'fit')
    }
  }
  document.addEventListener('keydown', onKeyDown, true)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeViewer(state)
  })
  const onResize = () => {
    const current = state.viewer && state.viewer.__dshMermaidViewer
    if (!current) return
    setViewerMode(state, current.mode || 'fit')
  }
  window.addEventListener('resize', onResize)

  overlay.__dshMermaidViewer = {
    state,
    record,
    onKeyDown,
    onResize,
    previousHtmlOverflow,
    previousBodyOverflow,
    body,
    svg,
    zoomLabel,
    naturalWidth,
    naturalHeight,
    scale: 1,
    mode: 'fit',
  }
  state.viewer = overlay
  setViewerMode(state, 'fit')
  try {
    close.focus()
  } catch {
    /* focus is best-effort */
  }
}

function viewerAvailableSize(viewer) {
  const style = getComputedStyle(viewer.body)
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
  return {
    width: Math.max(160, viewer.body.clientWidth - padX),
    height: Math.max(120, viewer.body.clientHeight - padY),
  }
}

function setViewerMode(state, mode) {
  const viewer = state.viewer && state.viewer.__dshMermaidViewer
  if (!viewer) return
  viewer.mode = mode
  const available = viewerAvailableSize(viewer)
  const fitScale = Math.min(available.width / viewer.naturalWidth, available.height / viewer.naturalHeight, 1)
  const widthScale = Math.min(available.width / viewer.naturalWidth, 1)
  const scale = mode === 'fit' ? fitScale : mode === 'width' ? widthScale : 1
  applyViewerScale(state, scale)
}

function scaleViewerBy(state, factor) {
  const viewer = state.viewer && state.viewer.__dshMermaidViewer
  if (!viewer) return
  applyViewerScale(state, (viewer.scale || 1) * factor)
}

function applyViewerScale(state, scale) {
  const overlay = state.viewer
  const viewer = overlay && overlay.__dshMermaidViewer
  if (!viewer) return
  const clamped = Math.min(4, Math.max(0.15, scale || 1))
  viewer.scale = clamped
  viewer.svg.style.width = Math.round(viewer.naturalWidth * clamped) + 'px'
  viewer.svg.style.height = 'auto'
  if (viewer.zoomLabel) viewer.zoomLabel.textContent = Math.round(clamped * 100) + '%'
  centerViewerScroll(viewer)
}

/**
 * Zooming changes the scrollable area; keep the view centered on the diagram.
 * The body uses start-aligned flex + `margin: auto` on the SVG, so the top/left
 * edges stay reachable when the content overflows (unlike flex centering, which
 * clips the start edge beyond the scroll origin).
 */
function centerViewerScroll(viewer) {
  const body = viewer && viewer.body
  if (!body) return
  const maxLeft = body.scrollWidth - body.clientWidth
  const maxTop = body.scrollHeight - body.clientHeight
  if (maxLeft > 0) body.scrollLeft = Math.round(maxLeft / 2)
  if (maxTop > 0) body.scrollTop = Math.round(maxTop / 2)
}

function closeViewer(state) {
  if (state.viewer) closeViewerElement(state.viewer)
}

function closeViewerElement(overlay) {
  const viewer = overlay && overlay.__dshMermaidViewer
  if (!viewer) return
  overlay.__dshMermaidViewer = null
  try {
    document.removeEventListener('keydown', viewer.onKeyDown, true)
  } catch {
    /* listener already gone */
  }
  try {
    if (viewer.onResize) window.removeEventListener('resize', viewer.onResize)
  } catch {
    /* listener already gone */
  }
  try {
    overlay.remove()
  } catch {
    /* already detached */
  }
  try {
    document.documentElement.style.overflow = viewer.previousHtmlOverflow || ''
    document.body.style.overflow = viewer.previousBodyOverflow || ''
  } catch {
    /* scroll lock restore is best-effort */
  }
  if (viewer.state && viewer.state.viewer === overlay) viewer.state.viewer = null
}

function cleanupRecord(record) {
  if (record.timer) clearTimeout(record.timer)
  if (record.copyTimer) clearTimeout(record.copyTimer)
  record.timer = 0
  record.copyTimer = 0
}

function teardownBlock(block, record) {
  cleanupRecord(record)
  for (const overlay of document.querySelectorAll('.dsh-mermaid-viewer')) {
    const data = overlay.__dshMermaidViewer
    if (data && data.record === record) closeViewerElement(overlay)
  }
  if (record.figure) record.figure.remove()
  record.figure = null
  record.canvas = null
  record.toggle = null
  record.typeLabel = null
  record.statusText = null
  record.copyButton = null
  record.fitButton = null
  record.expandButton = null
  record.tallHint = null
  record.pending = null
  record.sourceMode = false
  showSiblings(block)
  block.removeAttribute(ATTR_DIAGRAM)
  block.removeAttribute(ATTR_SOURCE)
}

/** Remove every trace this plugin may have left in the document. */
function sweepStale() {
  for (const element of document.querySelectorAll('[' + ATTR_FIGURE + ']')) element.remove()
  for (const element of document.querySelectorAll('[' + ATTR_HIDE + ']')) element.removeAttribute(ATTR_HIDE)
  for (const element of document.querySelectorAll('.md-code-block[' + ATTR_DIAGRAM + ']')) {
    element.removeAttribute(ATTR_DIAGRAM)
  }
  for (const element of document.querySelectorAll('.md-code-block[' + ATTR_SOURCE + ']')) {
    element.removeAttribute(ATTR_SOURCE)
  }
}

/* ------------------------------------------------------------------ */
/* diagnostics (compiled out of the release build)                     */
/* ------------------------------------------------------------------ */

function contentShape(block) {
  const content = block.querySelector(CONTENT_SELECTOR)
  if (!content) return '<no-content>'
  const pre = content.querySelector('pre')
  if (!pre) return '<no-pre>'
  return pre.tagName.toLowerCase() + '.' + String(pre.className || '').slice(0, 60)
}

function contentDisplay(block) {
  const content = block.querySelector(CONTENT_SELECTOR)
  if (!content) return '<no-content>'
  try {
    return getComputedStyle(content).display
  } catch {
    return '<unknown>'
  }
}

function rectOf(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return ''
  const rect = element.getBoundingClientRect()
  return Math.round(rect.width) + 'x' + Math.round(rect.height)
}

/** Development-only UI self-check: toggles the source view once and records layout. */
function selfTest(block, record) {
  if (record.tested) return
  record.tested = true
  const read = (label) => ({
    label,
    content: contentDisplay(block),
    figure: rectOf(record.figure),
    canvas: rectOf(record.figure ? record.figure.querySelector('.dsh-mermaid-canvas') : null),
    svg: rectOf(record.figure ? record.figure.querySelector('svg') : null),
    sourceMode: record.sourceMode,
    type: record.typeLabel ? record.typeLabel.textContent : '',
    actions: record.figure ? record.figure.querySelectorAll('.dsh-mermaid-action:not([hidden])').length : 0,
    toggleLabel: record.toggle ? record.toggle.title : '',
    fitMode: record.fitMode,
    overflowing: record.overflowing,
  })
  const diagram = read('diagram')
  try {
    record.toggle.click()
  } catch (error) {
    report('self-test', { error: String(error) })
    return
  }
  const source = read('source')
  try {
    record.toggle.click()
  } catch (error) {
    report('self-test', { error: String(error) })
    return
  }
  const restored = read('diagram-restored')
  report('self-test', { diagram, source, restored })
}

/* ------------------------------------------------------------------ */
/* environment                                                         */
/* ------------------------------------------------------------------ */

function currentColorScheme(ctx) {
  try {
    const theme = ctx.get('theme')
    const snapshot = theme && typeof theme.getTheme === 'function' ? theme.getTheme() : undefined
    const scheme = snapshot && snapshot.active && snapshot.active.colorScheme
    if (scheme === 'light' || scheme === 'dark') return scheme
  } catch {
    /* fall through to the media query */
  }
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function currentFontFamily() {
  try {
    const value = document.body ? getComputedStyle(document.body).fontFamily : ''
    if (value) return value
  } catch {
    /* ignore */
  }
  return 'sans-serif'
}

function createTranslator(ctx) {
  const fallback = (key) => EN_DICT[key] || key
  let locale
  try {
    locale = ctx.get('locale')
  } catch {
    return fallback
  }
  if (!locale || typeof locale.register !== 'function' || typeof locale.bind !== 'function') {
    if (__DSH_MERMAID_DEBUG__) report('i18n', { reason: 'no-locale-service' })
    return fallback
  }

  // A page can run one plugin instance per HMR generation. Registering a
  // namespace twice throws, so a leftover earlier registration is not a
  // failure: the dictionary is already the one this build wants.
  const disposers = []
  for (const [id, dict] of [['en', EN_DICT], ['zh', ZH_DICT]]) {
    try {
      disposers.push(locale.register(NS, id, dict))
    } catch {
      /* already registered by an earlier instance in this page */
    }
  }
  let translate
  try {
    translate = locale.bind(NS)
  } catch (error) {
    if (__DSH_MERMAID_DEBUG__) {
      report('i18n', { reason: 'bind-failed', message: String((error && error.message) || error).slice(0, 200) })
    }
    return fallback
  }
  if (disposers.length > 0 && typeof ctx.effect === 'function') {
    try {
      ctx.effect(() => () => {
        for (const dispose of disposers) {
          try {
            dispose()
          } catch {
            /* ignore */
          }
        }
      }, 'mermaid locale dictionaries')
    } catch {
      /* disposal is best-effort; a stale dictionary only costs one duplicate */
    }
  }

  const t = (key) => {
    try {
      const value = translate(key)
      return typeof value === 'string' && value.length > 0 ? value : fallback(key)
    } catch {
      return fallback(key)
    }
  }
  if (__DSH_MERMAID_DEBUG__) {
    report('i18n', { reason: 'registered', active: readActiveLocale(locale), viewSource: t('viewSource') })
  }
  return t
}

function readActiveLocale(locale) {
  try {
    const snapshot = typeof locale.getLocale === 'function' ? locale.getLocale() : locale.getSnapshot?.()
    return snapshot && snapshot.active ? String(snapshot.active) : '<unknown>'
  } catch {
    return '<error>'
  }
}

export default { apply }
