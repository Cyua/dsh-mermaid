/**
 * Host half of the Mermaid diagram plugin.
 *
 * Everything happens in the browser half (`./client` → `dist/client.js`):
 * Mermaid renders inside the page, so the Host half only exists to carry the
 * bundle row that loads it.
 */
export function apply() {}
