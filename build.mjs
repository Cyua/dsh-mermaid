#!/usr/bin/env node
/**
 * Build the Client half into `dist/client.js`.
 *
 * Mermaid (~5 MB minified) is bundled into the client module so the plugin is
 * fully self-contained: no CDN, no extra HTTP route, no runtime dependency.
 * The client module format is the one `dsh-client-modules` serves — a script
 * that registers a lazy factory on `window.__ModuleLoader__`, where the factory
 * body is a CommonJS module.
 *
 * Usage:
 *   node build.mjs            release build (diagnostics compiled out)
 *   node build.mjs --debug    same plugin plus a reporter to a loopback URL
 *                             (REPORT_URL, default http://127.0.0.1:7799/report)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const PKG_NAME = pkg.name
const OUT_DIR = path.join(ROOT, 'dist')
const DEBUG = process.argv.includes('--debug')
const REPORT_URL = process.env.REPORT_URL || 'http://127.0.0.1:7799/report'

const HEADER = `window.__ModuleLoader__.load({
	id: ${JSON.stringify(PKG_NAME)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
`

const FOOTER = `
		return module.exports.default ?? module.exports;
	},
});
`

const result = await build({
  entryPoints: [path.join(ROOT, 'src/client.js')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome111', 'edge111'],
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'warning',
  write: false,
  metafile: true,
  define: {
    __DSH_MERMAID_DEBUG__: DEBUG ? 'true' : 'false',
    __DSH_MERMAID_REPORT__: JSON.stringify(REPORT_URL),
  },
})

const body = result.outputFiles[0].text
const output = HEADER + body + FOOTER
fs.mkdirSync(OUT_DIR, { recursive: true })
const outFile = path.join(OUT_DIR, 'client.js')
fs.writeFileSync(outFile, output)

const inputs = Object.keys(result.metafile.inputs).filter((id) => !id.startsWith('node_modules'))
console.log(`wrote ${outFile}${DEBUG ? ' (debug: reports to ' + REPORT_URL + ')' : ''}`)
console.log(`  module id: ${PKG_NAME}`)
console.log(`  ${(Buffer.byteLength(output) / 1024 / 1024).toFixed(2)} MiB (${Buffer.byteLength(output)} bytes)`)
console.log(`  first-party inputs: ${inputs.join(', ')}`)
