/**
 * The /api/dsh-manus route family: config status/save, credit balance,
 * task CRUD + messages, and an attachment proxy download. Every route carries
 * a loopback-only trust fence (plus browser same-origin markers) — these
 * endpoints can spend real Manus credits, so LAN-exposed dsh web deployments
 * must not serve them.
 */

import { basename } from 'node:path'
import { collectAttachmentsWithPreview } from './manus.js'
import { keySource, maskKey } from './store.js'

/** Cap on JSON request bodies (config / task payloads are small). */
const MAX_JSON_BODY_BYTES = 256 * 1024

/** Loopback literal check plus browser same-origin markers (mirrors dsh-ssh). */
function isLoopbackRequest(request) {
  const address = request.socket.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

/** One JSON response. */
function writeJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.end(payload)
}

/** Read a JSON request body (undefined when too large or unparseable). */
async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined
  } catch {
    return undefined
  }
}

/** URL query helper (first value, decoded). */
function queryParam(url, name) {
  const value = url.searchParams.get(name)
  return value === null ? undefined : value
}

/** Build every /api/dsh-manus route (exact paths). */
export function makeRoutes(deps) {
  const { store, client } = deps

  /** Guard helper: fence + method check. */
  const guard = (req, res, method) => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { error: 'forbidden: loopback-only' })
      return false
    }
    if (req.method !== method) {
      writeJson(res, 405, { error: `method not allowed (expected ${method})` })
      return false
    }
    return true
  }

  const routes = [
    {
      kind: 'exact',
      path: '/api/dsh-manus/status',
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        const source = keySource(store)
        writeJson(res, 200, {
          ok: true,
          configured: source !== 'none',
          key_source: source,
          key_hint: source !== 'none' ? maskKey(client.apiKey()) : '',
          base_url: store.load().baseUrl,
        })
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-manus/config',
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        if (body === undefined) {
          writeJson(res, 400, { error: 'invalid JSON body' })
          return
        }
        const patch = {}
        if (typeof body.apiKey === 'string' && body.apiKey !== '') patch.apiKey = body.apiKey
        if (typeof body.baseUrl === 'string' && body.baseUrl !== '') patch.baseUrl = body.baseUrl
        try {
          if (Object.keys(patch).length > 0) store.save(patch)
          const source = keySource(store)
          writeJson(res, 200, {
            ok: true,
            configured: source !== 'none',
            key_source: source,
            key_hint: source !== 'none' ? maskKey(client.apiKey()) : '',
            base_url: store.load().baseUrl,
          })
        } catch (error) {
          writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-manus/credits',
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        try {
          // The real API returns credit fields flat at the top level.
          const data = await client.availableCredits()
          writeJson(res, 200, { ok: true, data })
        } catch (error) {
          writeJson(res, 200, {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-manus/tasks',
      handler: async (req, res) => {
        if (req.method === 'GET') {
          if (!guard(req, res, 'GET')) return
          try {
            const url = new URL(req.url, 'http://localhost')
            const limit = Number(queryParam(url, 'limit') ?? '20')
            const result = await client.listTasks({ limit: Number.isFinite(limit) ? limit : 20 })
            writeJson(res, 200, { ok: true, tasks: result.tasks ?? [] })
          } catch (error) {
            writeJson(res, 200, { ok: false, tasks: [], error: error instanceof Error ? error.message : String(error) })
          }
          return
        }
        if (req.method === 'POST') {
          if (!guard(req, res, 'POST')) return
          const body = await readJsonBody(req)
          if (body === undefined || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
            writeJson(res, 400, { error: 'prompt is required' })
            return
          }
          try {
            const created = await client.createTask(body.prompt, {
              title: typeof body.title === 'string' ? body.title : undefined,
              agent_profile: typeof body.agent_profile === 'string' ? body.agent_profile : undefined,
              locale: typeof body.locale === 'string' ? body.locale : undefined,
            })
            writeJson(res, 200, { ok: true, task: created })
          } catch (error) {
            writeJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
          }
          return
        }
        writeJson(res, 405, { error: 'method not allowed' })
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-manus/task',
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        const url = new URL(req.url, 'http://localhost')
        const taskId = queryParam(url, 'task_id')
        if (!taskId) {
          writeJson(res, 400, { error: 'task_id is required' })
          return
        }
        try {
          const result = await client.taskDetail(taskId)
          writeJson(res, 200, { ok: true, task: result.task ?? null })
        } catch (error) {
          writeJson(res, 200, { ok: false, task: null, error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-manus/task/messages',
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        const url = new URL(req.url, 'http://localhost')
        const taskId = queryParam(url, 'task_id')
        if (!taskId) {
          writeJson(res, 400, { error: 'task_id is required' })
          return
        }
        const limit = Number(queryParam(url, 'limit') ?? '100')
        try {
          // Verbose ascending: tool_used events carry the action_id we use for
          // per-attachment Manus preview URLs.
          const result = await client.listMessages(taskId, {
            limit: Number.isFinite(limit) ? limit : 100,
            order: 'asc',
            verbose: true,
          })
          const messages = Array.isArray(result.messages) ? result.messages : []
          const attachments = collectAttachmentsWithPreview(messages, taskId)
          writeJson(res, 200, { ok: true, messages, attachments })
        } catch (error) {
          writeJson(res, 200, { ok: false, messages: [], attachments: [], error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-manus/task/reply',
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        if (body === undefined || typeof body.task_id !== 'string' || typeof body.prompt !== 'string') {
          writeJson(res, 400, { error: 'task_id and prompt are required' })
          return
        }
        try {
          await client.sendMessage(body.task_id, body.prompt)
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-manus/task/stop',
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const body = await readJsonBody(req)
        if (body === undefined || typeof body.task_id !== 'string') {
          writeJson(res, 400, { error: 'task_id is required' })
          return
        }
        try {
          await client.stopTask(body.task_id)
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
    {
      kind: 'exact',
      path: '/api/dsh-manus/attachment',
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        const url = new URL(req.url, 'http://localhost')
        const attachmentUrl = queryParam(url, 'url')
        if (!attachmentUrl) {
          writeJson(res, 400, { error: 'url is required' })
          return
        }
        const filename = queryParam(url, 'filename') ?? basename(new URL(attachmentUrl).pathname) ?? 'download'
        try {
          const response = await client.download(attachmentUrl)
          if (!response.ok) {
            writeJson(res, 502, { error: `upstream HTTP ${response.status}` })
            return
          }
          const headers = {
            'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
            'content-disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          }
          const upstreamLength = response.headers.get('content-length')
          if (upstreamLength !== null) headers['content-length'] = upstreamLength
          res.writeHead(200, headers)
          if (response.body) {
            const reader = response.body.getReader()
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              res.write(value)
            }
          }
          res.end()
        } catch (error) {
          writeJson(res, 502, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
  ]

  return { routes }
}
