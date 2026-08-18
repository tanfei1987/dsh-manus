/**
 * dsh-manus — host config store.
 *
 * One JSON file (`~/.dsh/manus.json`, mode 0600) holding the Manus API key
 * and base URL, written atomically (tmp + rename). The key may alternatively
 * come from the MANUS_API_KEY environment variable, which wins over the file.
 * The key is a secret — it is never logged and never echoed by any surface
 * (only a masked hint is exposed).
 */

import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

/** Default Manus API base URL. */
export const DEFAULT_BASE_URL = 'https://api.manus.ai'

/** Store file location: <home>/.dsh/manus.json. */
export function configPath() {
  return join(homedir(), '.dsh', 'manus.json')
}

/** Where the API key currently comes from. */
export function keySource(store) {
  if (process.env.MANUS_API_KEY) return 'env'
  const config = store.load()
  return config.apiKey ? 'file' : 'none'
}

/** Mask a key for display: first 6 chars + dots + last 4. */
export function maskKey(key) {
  if (!key) return ''
  if (key.length <= 10) return '••••'
  return key.slice(0, 6) + '••••••' + key.slice(-4)
}

/** The host config store. Pure file I/O — no cordis dependency. */
export class ManusStore {
  /** The JSON file path. */
  constructor(path = configPath()) {
    this.path = resolve(path)
  }

  /** Load config (defaults when the file is absent or malformed). */
  load() {
    try {
      const raw = JSON.parse(readFileSync(this.path, 'utf8'))
      return {
        apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
        baseUrl: typeof raw.baseUrl === 'string' && raw.baseUrl !== ''
          ? raw.baseUrl
          : DEFAULT_BASE_URL,
      }
    } catch {
      return { apiKey: '', baseUrl: DEFAULT_BASE_URL }
    }
  }

  /** Persist config atomically with owner-only permissions. */
  save(patch) {
    const next = { ...this.load(), ...patch }
    if (next.baseUrl === DEFAULT_BASE_URL) delete next.baseUrl
    mkdirSync(dirname(this.path), { recursive: true })
    const tmp = this.path + '.tmp'
    writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 })
    try { chmodSync(tmp, 0o600) } catch { /* best effort */ }
    renameSync(tmp, this.path)
    try { chmodSync(this.path, 0o600) } catch { /* best effort */ }
  }

  /** The effective API key: env var wins, then the store file. */
  apiKey() {
    if (process.env.MANUS_API_KEY) return process.env.MANUS_API_KEY
    return this.load().apiKey
  }
}
