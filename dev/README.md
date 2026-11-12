# Verification harness (development only)

These files are not part of the published package. They are the loopback harness
used to check the plugin inside the running DSH Web UI:

- `report-server.mjs` — a small HTTP listener on `127.0.0.1:7799` that appends
  JSON events to `reports.jsonl` and dumps posted SVGs into `svg-dump/`.
- `probe-bundle/` — a temporary bundle that injects known Mermaid sources
  off-screen, reads back the rendered figure chrome, audits per-text contrast,
  and exercises the full-screen viewer. Install it the same way as the plugin:

  ```
  plugin_manager action = install_bundle target = <repo>/dev/verification/probe-bundle
  ```

Typical debug loop:

1. `npm run build:debug` (the Client half then reports to the loopback server).
2. Start the listener: `node dev/verification/report-server.mjs`.
3. Install the probe bundle and re-enable it to run the checks.
4. Read `reports.jsonl` / `svg-dump/`, fix, rebuild, re-enable the plugin row.

Remove both bundles from the profile when done; the probe bundle inserts a
`mermaid-probe` row that must not stay in a shared profile.
