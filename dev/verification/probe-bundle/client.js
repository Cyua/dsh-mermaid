window.__ModuleLoader__.load({
  id: '@local/dsh-mermaid-probe',
  factory: (require) => {
    const BASE = 'http://127.0.0.1:7799'
    function post(url, body, json) {
      try {
        fetch(BASE + url, {
          method: 'POST',
          mode: 'no-cors',
          keepalive: true,
          body: json ? JSON.stringify(body) : body,
        })
      } catch {}
    }
    function rect(el) {
      if (!el) return ''
      const r = el.getBoundingClientRect()
      return Math.round(r.width) + 'x' + Math.round(r.height)
    }
    function actorInfo(svg) {
      const shapes = []
      for (const el of (svg ? svg.querySelectorAll('rect.actor[name], g.actor-man[name]') : [])) {
        const tag = el.tagName.toLowerCase()
        const style = getComputedStyle(el)
        const circle = tag === 'g' ? el.querySelector('circle') : null
        shapes.push({
          name: el.getAttribute('name'),
          tag,
          fill: tag === 'rect' ? style.fill : circle ? getComputedStyle(circle).fill : style.fill,
          stroke: style.stroke,
        })
      }
      const labels = [...(svg ? svg.querySelectorAll('text.actor') : [])].map((text) => {
        const box = text.getBoundingClientRect()
        return {
          x: Math.round(box.left + box.width / 2),
          text: (text.textContent || '').trim().slice(0, 12),
          fill: getComputedStyle(text.querySelector('tspan') || text).fill,
        }
      })
      return { shapes, labels }
    }

    function clusterInfo(svg) {
      const out = []
      for (const cluster of (svg ? svg.querySelectorAll('g.cluster') : [])) {
        if (cluster.classList.contains('clusters')) continue
        const rect = cluster.querySelector(':scope > rect') || cluster.querySelector('rect')
        if (!rect) continue
        const style = getComputedStyle(rect)
        const inline = rect.getAttribute('style') || ''
        const label = cluster.querySelector('.cluster-label text, .cluster-label span')
        const labelStyle = label ? getComputedStyle(label) : null
        out.push({
          id: cluster.id || '',
          fill: style.fill,
          stroke: style.stroke,
          inlineFill: /fill\s*:/.test(inline),
          label: label ? (label.textContent || '').trim().slice(0, 12) : '',
          labelColor: labelStyle ? (labelStyle.fill && labelStyle.fill !== 'none' ? labelStyle.fill : labelStyle.color) : '',
        })
      }
      return out
    }

    function uiOf(figure) {
      const canvas = figure.querySelector('.dsh-mermaid-canvas')
      const svg = canvas ? canvas.querySelector('svg') : null
      const buttons = [...figure.querySelectorAll('.dsh-mermaid-action')].map((button) => ({
        title: button.title,
        hidden: button.hidden,
      }))
      const style = canvas ? getComputedStyle(canvas) : null
      const hint = figure.querySelector('.dsh-mermaid-tall-hint')
      return {
        state: figure.getAttribute('data-state'),
        card: rect(figure),
        canvas: rect(canvas),
        canvasMaxHeight: style ? style.maxHeight : '',
        canvasScrollHeight: canvas ? canvas.scrollHeight : 0,
        canvasClientHeight: canvas ? canvas.clientHeight : 0,
        overflowX: canvas ? canvas.getAttribute('data-overflow') : '',
        overflowY: canvas ? canvas.getAttribute('data-overflow-y') : '',
        tallAttr: figure.hasAttribute('data-tall'),
        hintVisible: hint ? !hint.hidden && getComputedStyle(hint).display !== 'none' : false,
        hintText: hint ? hint.textContent.trim() : '',
        type: figure.querySelector('.dsh-mermaid-type') ? figure.querySelector('.dsh-mermaid-type').textContent : '',
        buttons,
        svg: rect(svg),
        widthStyle: svg ? svg.style.width : '',
      }
    }
    function topReach(scroller) {
      const svg = scroller ? scroller.querySelector('svg') : null
      if (!scroller || !svg) return null
      scroller.scrollTop = 0
      scroller.scrollLeft = 0
      const box = scroller.getBoundingClientRect()
      const svgBox = svg.getBoundingClientRect()
      return {
        topGap: Math.round(svgBox.top - box.top),
        leftGap: Math.round(svgBox.left - box.left),
        scrollTop: scroller.scrollTop,
        scrollLeft: scroller.scrollLeft,
        maxTop: scroller.scrollHeight - scroller.clientHeight,
        maxLeft: scroller.scrollWidth - scroller.clientWidth,
      }
    }
    function viewerInfo() {
      const overlay = document.querySelector('.dsh-mermaid-viewer')
      if (!overlay) return { exists: false }
      const body = overlay.querySelector('.dsh-mermaid-viewer-body')
      const svg = body ? body.querySelector('svg') : null
      const zoom = overlay.querySelector('.dsh-mermaid-viewer-zoom')
      return {
        exists: true,
        panel: rect(overlay.querySelector('.dsh-mermaid-viewer-panel')),
        body: rect(body),
        svg: rect(svg),
        svgWidth: svg ? svg.style.width : '',
        zoom: zoom ? zoom.textContent : '',
        pageLocked: document.body.style.overflow === 'hidden',
      }
    }
    function clickNode(node) {
      try {
        if (!node) return false
        node.click()
        return true
      } catch {
        return false
      }
    }
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
    function viewerClose() {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      return !document.querySelector('.dsh-mermaid-viewer')
    }

    const SMALL_SEQ = [
      'sequenceDiagram',
      '    actor U as 用户',
      '    participant F as 前端',
      '    participant N as 后端',
      '    U->>F: 点击',
      '    F->>N: 请求',
      '    N-->>F: 响应',
    ].join(String.fromCharCode(10))

    const BIG_SEQ = [
      'sequenceDiagram',
      '    autonumber',
      '    actor U as 用户',
      '    participant F as 前端 Web',
      '    participant N as API 网关',
      '    participant M as MongoDB',
      '    participant P as 消息队列',
      '    participant J as CI Worker',
      '    participant C as AI Agent',
      '    U->>F: 点击「继续分析」',
      '    F->>N: POST /analysis/trigger',
      '    N->>N: 选 skill + 校验参数',
      '    N->>M: 读取文档状态',
      '    alt 文档未就绪',
      '        N-->>F: accepted=false',
      '    else 文档就绪',
      '        N->>M: CAS 抢锁 + 写轮次',
      '        N->>P: POST /events',
      '        P->>J: buildWithParameters',
      '        J->>C: claude -p "/skill"',
      '        C->>N: GET /analysis/context',
      '        N-->>C: docs + issues',
      '        C->>C: 预检 → 抽证据 → 成文',
      '        C-->>J: claude_result.md',
      '        J->>P: POST /result',
      '    end',
      '    loop 每 10s 轮询',
      '        F->>N: GET /feature/analysis',
      '        N->>P: GET /events/id',
      '        P-->>N: status + result',
      '    end',
    ].join(String.fromCharCode(10))

    const GENERIC_FLOW = [
      'flowchart TB',
      '    subgraph L1["① 采集层 · collector"]',
      '        A1["输入解析"]',
      '        A2["字段清洗"]',
      '    end',
      '    subgraph L2["② 处理层 · pipeline"]',
      '        B1["规则匹配"]',
      '        B2["结果汇总"]',
      '    end',
      '    subgraph L3["③ 存储层 · storage"]',
      '        C1[("缓存")]',
      '        C2[("数据库")]',
      '    end',
      '    A2 --> B1 --> C1',
      '    B1 --> B2',
      '    B2 --> C2',
    ].join(String.fromCharCode(10))

    const CUSTOM_FLOW = [
      'flowchart LR',
      '    subgraph ONE["显式样式分组"]',
      '        N1["节点 A"]',
      '    end',
      '    subgraph TWO["默认样式分组"]',
      '        N2["节点 B"]',
      '    end',
      '    style ONE fill:#3a2f1b,stroke:#c99a3d,color:#f5e8c8',
      '    N1 --> N2',
    ].join(String.fromCharCode(10))

    const TESTS = [
      { id: 'seq-small', code: SMALL_SEQ },
      { id: 'seq-big', code: BIG_SEQ },
      { id: 'flow-subgraphs', code: GENERIC_FLOW },
      { id: 'flow-custom-style', code: CUSTOM_FLOW },
    ]

    function fakeBlock(code, top = 0) {
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;left:0;top:' + (top || 0) + 'px;width:900px;opacity:0;pointer-events:none;z-index:-1;'
      host.setAttribute('data-probe-host', '1')
      host.innerHTML =
        '<div class="md-code-block">' +
        '<div><div data-code-block-banner><div>mermaid</div></div></div>' +
        '<div data-code-block-content><pre><code></code></pre></div>' +
        '</div>'
      host.querySelector('code').textContent = code
      document.body.appendChild(host)
      return host
    }

    let cancelled = false
    async function runTests(epoch) {
      for (const stale of document.querySelectorAll('[data-probe-host]')) stale.remove()
      const alive = () => !cancelled && window.__dshMermaidProbeEpoch === epoch
      for (const test of TESTS) {
        if (!alive()) return
        const host = fakeBlock(test.code)
        await sleep(3600)
        if (!alive()) {
          host.remove()
          return
        }
        const figure = host.querySelector('[data-dsh-mermaid-figure]')
        const svg = figure ? figure.querySelector('.dsh-mermaid-canvas svg') : null
        if (!figure || !svg) {
          post('/report', { event: 'test-missing', id: test.id, epoch, at: Date.now() }, true)
          host.remove()
          continue
        }
        post('/svg', svg.outerHTML)
        const before = uiOf(figure)
        const inlineReach = topReach(figure.querySelector('.dsh-mermaid-canvas'))
        const figureButtons = [...figure.querySelectorAll('.dsh-mermaid-action')]
        const expand = figureButtons[2]

        clickNode(expand)
        await sleep(220)
        const viewerFit = viewerInfo()
        const viewerFitReach = topReach(document.querySelector('.dsh-mermaid-viewer-body'))
        const controls = [...document.querySelectorAll('.dsh-mermaid-viewer-controls .dsh-mermaid-action')]
        clickNode(controls[1])
        await sleep(80)
        clickNode(controls[1])
        await sleep(120)
        const viewerZoom = viewerInfo()
        const bodyEl = document.querySelector('.dsh-mermaid-viewer-body')
        const zoomReach = topReach(bodyEl)
        const centered = {
          scrollTop: bodyEl ? bodyEl.scrollTop : 0,
          scrollLeft: bodyEl ? bodyEl.scrollLeft : 0,
        }
        clickNode(controls[2])
        await sleep(120)
        const viewerReset = viewerInfo()
        const closed = viewerClose()

        let hintViewer = null
        let hintClosed = null
        const hint = figure.querySelector('.dsh-mermaid-tall-hint')
        if (hint && !hint.hidden) {
          clickNode(hint)
          await sleep(200)
          hintViewer = viewerInfo()
          hintClosed = viewerClose()
        }

        post(
          '/report',
          { event: 'test', id: test.id, epoch, at: Date.now(), clusters: clusterInfo(svg), actors: actorInfo(svg), ui: before, inlineReach, viewerFit, viewerFitReach, viewerZoom, zoomReach, centered, viewerReset, closed, hintViewer, hintClosed },
          true,
        )
        host.remove()
      }
      // Viewport-lazy rendering: a block parked far below the viewport must keep
      // its native code block and render only after it moves near the viewport.
      if (alive()) {
        const lazyHost = fakeBlock(GENERIC_FLOW, 2400)
        await sleep(1800)
        const content = lazyHost.querySelector('[data-code-block-content]')
        const before = {
          figure: Boolean(lazyHost.querySelector('[data-dsh-mermaid-figure]')),
          nativeVisible: Boolean(content) && !content.hasAttribute('data-dsh-mermaid-hide'),
          codeBlock: Boolean(lazyHost.querySelector('.md-code-block')),
        }
        lazyHost.style.top = '0px'
        await sleep(2400)
        const figure = lazyHost.querySelector('[data-dsh-mermaid-figure]')
        const after = {
          figure: Boolean(figure),
          state: figure ? figure.getAttribute('data-state') : '',
          svg: Boolean(lazyHost.querySelector('.dsh-mermaid-canvas svg')),
          nativeHidden: Boolean(lazyHost.querySelector('[data-code-block-content][data-dsh-mermaid-hide]')),
        }
        post('/report', { event: 'lazy-test', epoch, at: Date.now(), before, after }, true)
        lazyHost.remove()
      }
      // Viewer resize: every edge/corner resizes, and the size is remembered.
      if (alive()) {
        let previousSize = null
        try {
          previousSize = window.localStorage.getItem('dsh-mermaid:viewer-size')
          window.localStorage.removeItem('dsh-mermaid:viewer-size')
        } catch {
          /* storage unavailable */
        }
        const host = fakeBlock(GENERIC_FLOW)
        await sleep(2600)
        const figure = host.querySelector('[data-dsh-mermaid-figure]')
        const expand = figure ? [...figure.querySelectorAll('.dsh-mermaid-action')][2] : null
        clickNode(expand)
        await sleep(320)
        const overlay = document.querySelector('.dsh-mermaid-viewer')
        const panel = overlay ? overlay.querySelector('.dsh-mermaid-viewer-panel') : null
        const body = overlay ? overlay.querySelector('.dsh-mermaid-viewer-body') : null
        const measure = () => {
          const rect = panel.getBoundingClientRect()
          return {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            bodyWidth: body ? body.clientWidth : 0,
            bodyHeight: body ? body.clientHeight : 0,
          }
        }
        const drag = async (handleAxis, dx, dy) => {
          const grip = overlay.querySelector('.dsh-mermaid-viewer-grip[data-axis="' + handleAxis + '"]')
          if (!grip) return null
          const rect = grip.getBoundingClientRect()
          const startX = Math.round(rect.left + rect.width / 2)
          const startY = Math.round(rect.top + rect.height / 2)
          grip.dispatchEvent(
            new PointerEvent('pointerdown', {
              bubbles: true,
              cancelable: true,
              button: 0,
              buttons: 1,
              pointerId: 7,
              pointerType: 'mouse',
              clientX: startX,
              clientY: startY,
            }),
          )
          await sleep(60)
          window.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              buttons: 1,
              pointerId: 7,
              pointerType: 'mouse',
              clientX: startX + dx,
              clientY: startY + dy,
            }),
          )
          await sleep(60)
          window.dispatchEvent(
            new PointerEvent('pointerup', {
              bubbles: true,
              button: 0,
              pointerId: 7,
              pointerType: 'mouse',
              clientX: startX + dx,
              clientY: startY + dy,
            }),
          )
          await sleep(160)
          return measure()
        }
        let before = null
        let afterSE = null
        let afterW = null
        let afterSW = null
        let zoom = ''
        let stored = ''
        let reopened = null
        if (panel) {
          before = { ...measure(), grips: overlay.querySelectorAll('.dsh-mermaid-viewer-grip').length }
          afterSE = await drag('se', -160, -100)
          afterW = await drag('w', -120, 0)
          afterSW = await drag('sw', -100, 80)
          const zoomLabel = overlay.querySelector('.dsh-mermaid-viewer-zoom')
          zoom = zoomLabel ? zoomLabel.textContent : ''
          stored = window.localStorage.getItem('dsh-mermaid:viewer-size')
          viewerClose()
          await sleep(160)
          clickNode(expand)
          await sleep(280)
          const overlay2 = document.querySelector('.dsh-mermaid-viewer')
          const panel2 = overlay2 ? overlay2.querySelector('.dsh-mermaid-viewer-panel') : null
          reopened = panel2
            ? { width: Math.round(panel2.getBoundingClientRect().width), height: Math.round(panel2.getBoundingClientRect().height) }
            : null
          viewerClose()
        }
        try {
          if (previousSize) window.localStorage.setItem('dsh-mermaid:viewer-size', previousSize)
          else window.localStorage.removeItem('dsh-mermaid:viewer-size')
        } catch {
          /* storage unavailable */
        }
        post('/report', { event: 'viewer-resize', epoch, before, afterSE, afterW, afterSW, zoom, stored, reopened }, true)
        host.remove()
      }
      post('/report', { event: 'tests-done', epoch, at: Date.now() }, true)
    }

    return {
      inject: [],
      apply(ctx) {
        const epoch = (window.__dshMermaidProbeEpoch = (window.__dshMermaidProbeEpoch || 0) + 1)
        post('/report', { event: 'probe-apply', epoch, at: Date.now() }, true)
        cancelled = false
        ctx.effect(() => {
          const startTimer = setTimeout(() => runTests(epoch), 1500)
          return () => {
            cancelled = true
            clearTimeout(startTimer)
          }
        }, 'mermaid probe')
      },
    }
  },
})
