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

    const USER_DIAGRAM = [
      'sequenceDiagram',
      '    autonumber',
      '    participant JK as Jenkins',
      '    participant CI as CI ai_autotest<br/>Jenkinsfile / workflow.py',
      '    participant NX as Nexus 后端',
      '    participant DB as MongoDB',
      '    participant FE as 前端',
      '    participant CRON as 定时任务<br/>cron 每 5 分钟',
      '    rect rgb(255,247,230)',
      '    Note over JK,DB: ③ CI 执行与回传（分钟~小时级）',
      '    JK->>CI: 启动构建 → Init 阶段',
      '    CI->>NX: PUT /issue_autotest/running/{autotest_id}',
      '    NX->>DB: stage=started · 补 running_jenkins',
      '    alt 派发后又提了新代码',
      '        CI->>NX: POST /report stage=waiting · passed=false',
      '        Note over DB: 同一条 autotest_id 5min 后回到调度重排',
      '    else 版本通过',
      '        CI->>CI: PrepareSvn → PrepareNaraka → 起服务端 / 客户端',
      '        NX->>DB: 终态 + result + report + finish_time',
      '    end',
      '    end',
      '    rect rgb(243,236,253)',
      '    Note over FE,NX: ④ 前端展示（QA 视角）',
      '    FE->>NX: GET /issue_autotest/queue',
      '    FE->>NX: POST /issue_autotest/feedback',
      '    end',
      '    rect rgb(253,234,234)',
      '    loop 每 5 分钟',
      '    CRON->>NX: check_started_autotests()',
      '    NX->>DB: stage=failure（排队>6h）',
      '    end',
      '    end',
    ].join(String.fromCharCode(10))

    const TESTS = [
      { id: 'user-big', code: USER_DIAGRAM },
      { id: 'small', code: ['sequenceDiagram', '  participant A', '  participant B', '  A->>B: 你好'].join(String.fromCharCode(10)) },
    ]

    function fakeBlock(code) {
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;left:-30000px;top:0;width:900px;pointer-events:none;'
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
          { event: 'test', id: test.id, epoch, at: Date.now(), ui: before, inlineReach, viewerFit, viewerFitReach, viewerZoom, zoomReach, centered, viewerReset, closed, hintViewer, hintClosed },
          true,
        )
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
