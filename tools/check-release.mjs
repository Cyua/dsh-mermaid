#!/usr/bin/env node
/**
 * Sanity-check the release artifact before publishing.
 *
 * Fails when the Client half is missing, is not in the DSH module format, is
 * not registered under the package name, or still contains the local debug
 * reporter strings that must only exist in `--debug` builds.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const file = path.join(ROOT, 'dist', 'client.js')

if (!fs.existsSync(file)) {
  console.error(`missing ${file} — run \`npm run build\` first`)
  process.exit(1)
}

const text = fs.readFileSync(file, 'utf8')
const problems = []

if (!text.startsWith('window.__ModuleLoader__.load({')) {
  problems.push('does not start with the DSH module-loader header')
}
if (!text.includes(JSON.stringify(pkg.name))) {
  problems.push(`does not register the package name ${pkg.name}`)
}
for (const marker of ['127.0.0.1:7799', '__DSH_MERMAID_DEBUG__', 'render-ok', 'self-test']) {
  if (text.includes(marker)) problems.push(`contains debug marker: ${marker}`)
}

if (problems.length > 0) {
  console.error('release artifact check failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const bytes = Buffer.byteLength(text)
console.log(`dist/client.js ok — module ${pkg.name}@${pkg.version}, ${(bytes / 1024 / 1024).toFixed(2)} MiB`)
