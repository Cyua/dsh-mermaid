/**
 * Local verification listener for the Mermaid plugin.
 *
 * The client half posts JSON events to this loopback server so the build can be
 * verified inside the running Web UI without browser automation. Started as a
 * background job during development only; it is never part of the plugin.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT || 7799)
const ROOT = path.join(import.meta.dirname, '..')
const LOG = path.join(ROOT, 'reports.jsonl')
const SVG_DIR = path.join(ROOT, 'svg-dump')
let svgSeq = 0

fs.mkdirSync(SVG_DIR, { recursive: true })

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }
  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8')
    if (req.url && req.url.startsWith('/svg')) {
      svgSeq += 1
      const file = path.join(SVG_DIR, `dump-${String(svgSeq).padStart(3, '0')}.svg`)
      fs.writeFileSync(file, body)
      console.log(`svg dump -> ${file} (${body.length} bytes)`)
      res.writeHead(204).end()
      return
    }
    const line = JSON.stringify({ at: new Date().toISOString(), url: req.url, body })
    fs.appendFileSync(LOG, line + '\n')
    console.log(line)
    res.writeHead(204).end()
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`report server listening on http://127.0.0.1:${PORT} -> ${LOG}`)
})
