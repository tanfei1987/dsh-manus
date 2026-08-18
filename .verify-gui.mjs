// Verify dsh-manus client mounts in the real web GUI (headless).
import { chromium } from 'file:///C:/nvm4w/nodejs/node_modules/@playwright/mcp/node_modules/playwright/index.mjs'

const errors = []
const logs = []

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Users/admin/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('console', (msg) => {
  const text = msg.text()
  if (msg.type() === 'error') errors.push(text)
  logs.push(`[${msg.type()}] ${text}`)
})
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message))

await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded', timeout: 30000 })
// Wait for the shell + plugin client to mount.
await page.waitForTimeout(8000)

const result = await page.evaluate(async () => {
  const entry = document.querySelector('[data-dsh-manus-entry]')
  const entryInfo = entry ? {
    text: entry.textContent.trim(),
    inDom: document.body.contains(entry),
  } : null

  // Toggle the panel open.
  let panelState = null
  if (entry) {
    entry.click()
    await new Promise((r) => setTimeout(r, 500))
    const view = document.querySelector('[data-dsh-manus-view]')
    panelState = {
      htmlActive: document.documentElement.getAttribute('data-dsh-manus-active'),
      viewInDom: !!view,
      viewDisplay: view ? getComputedStyle(view).display : null,
      panelTitle: view ? (view.querySelector('.dsh-manus-title')?.textContent ?? null) : null,
      hasKeyInput: !!view?.querySelector('input[type="password"]'),
      hasPrompt: !!view?.querySelector('textarea'),
      creditsBadge: view?.querySelector('.dsh-manus-badge')?.textContent ?? null,
    }
  }

  // Probe the status route from the page's origin.
  let status = null
  try {
    const res = await fetch('/api/dsh-manus/status')
    status = await res.json()
  } catch (e) {
    status = { fetchError: String(e) }
  }

  return { entryInfo, panelState, status }
})

console.log('=== RESULT ===')
console.log(JSON.stringify(result, null, 2))
console.log('=== CONSOLE ERRORS (' + errors.length + ') ===')
errors.slice(0, 20).forEach((e) => console.log(e))
console.log('=== RELEVANT LOGS ===')
logs.filter((l) => l.includes('dsh-manus') || l.includes('manus')).slice(0, 20).forEach((l) => console.log(l))

await browser.close()
