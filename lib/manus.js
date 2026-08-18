/**
 * dsh-manus — Manus API engine.
 *
 * Thin fetch-based client for the official Manus API v2
 * (https://open.manus.ai/docs/v2 — base URL https://api.manus.ai). No external
 * dependencies: Node >= 18 global fetch + AbortController. Handles the
 * standard { ok, request_id, error } envelope, task creation / polling /
 * result extraction / attachment download, and credit balance queries.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

/** Structured Manus API failure. */
export class ManusApiError extends Error {
  constructor(message, code = 'manus_error', requestId, status) {
    super(message)
    this.name = 'ManusApiError'
    this.code = code
    this.requestId = requestId
    this.status = status
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The Manus API client. */
export class ManusClient {
  /**
   * @param store - config store providing the API key and base URL.
   * @param opts - { timeoutMs } default request timeout.
   */
  constructor(store, opts = {}) {
    this.store = store
    this.timeoutMs = opts.timeoutMs ?? 30000
  }

  /** The API key, or throw when unconfigured. */
  apiKey() {
    const key = this.store.apiKey()
    if (!key) {
      throw new ManusApiError(
        '未配置 Manus API Key：请打开侧边栏「Manus」面板填写，或设置环境变量 MANUS_API_KEY。',
        'no_api_key',
      )
    }
    return key
  }

  baseUrl() {
    return (this.store.load().baseUrl || 'https://api.manus.ai').replace(/\/+$/, '')
  }

  /** One JSON request with the standard envelope. */
  async request(method, path, { query, body, timeoutMs } = {}) {
    const url = new URL(this.baseUrl() + path)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue
        url.searchParams.set(key, String(value))
      }
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? this.timeoutMs)
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          'x-manus-api-key': this.apiKey(),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      })
      const text = await response.text()
      let json = null
      try { json = JSON.parse(text) } catch { /* non-JSON body */ }
      if (!response.ok || (json !== null && json.ok === false)) {
        const error = json?.error ?? {}
        throw new ManusApiError(
          error.message ?? `Manus API 请求失败（HTTP ${response.status}）`,
          error.code ?? `http_${response.status}`,
          json?.request_id,
          response.status,
        )
      }
      return json
    } catch (error) {
      if (error instanceof ManusApiError) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ManusApiError('请求 Manus API 超时', 'timeout')
      }
      throw new ManusApiError(`网络错误：${error instanceof Error ? error.message : String(error)}`, 'network')
    } finally {
      clearTimeout(timer)
    }
  }

  // ------------------------------------------------------------ tasks

  /** Create a task. Returns the raw response (task_id, task_url, ...). */
  async createTask(message, opts = {}) {
    const body = { message: { content: message } }
    for (const field of ['project_id', 'locale', 'interactive_mode', 'hide_in_task_list', 'share_visibility', 'agent_profile', 'title']) {
      if (opts[field] !== undefined) body[field] = opts[field]
    }
    if (opts.structured_output_schema !== undefined) {
      body.structured_output_schema = opts.structured_output_schema
    }
    return this.request('POST', '/v2/task.create', { body })
  }

  /** Send a follow-up message (multi-turn / reply to messageAskUser). */
  async sendMessage(taskId, content, opts = {}) {
    const body = { task_id: taskId, message: { content } }
    for (const field of ['locale', 'agent_profile', 'interactive_mode']) {
      if (opts[field] !== undefined) body[field] = opts[field]
    }
    if (opts.structured_output_schema !== undefined) {
      body.structured_output_schema = opts.structured_output_schema
    }
    return this.request('POST', '/v2/task.sendMessage', { body })
  }

  /** List task events (conversation + status). */
  async listMessages(taskId, { limit = 50, order = 'desc', cursor, verbose = false } = {}) {
    return this.request('GET', '/v2/task.listMessages', {
      query: { task_id: taskId, limit, order, cursor, verbose: verbose ? 'true' : undefined },
    })
  }

  /** Task status and metadata. */
  async taskDetail(taskId) {
    return this.request('GET', '/v2/task.detail', { query: { task_id: taskId } })
  }

  /** List recent tasks. */
  async listTasks({ limit = 20, cursor, scope, agent_id } = {}) {
    return this.request('GET', '/v2/task.list', {
      query: { limit, cursor, scope, agent_id },
    })
  }

  /** Stop a running task. */
  async stopTask(taskId) {
    return this.request('POST', '/v2/task.stop', { body: { task_id: taskId } })
  }

  // ------------------------------------------------------------ misc

  /** Credit balance for the API key's caller. */
  async availableCredits() {
    return this.request('GET', '/v2/usage.availableCredits')
  }

  /** List custom agents in the account. */
  async listAgents() {
    return this.request('GET', '/v2/agent.list')
  }

  /** Fetch an attachment URL (Manus file CDN), with the API key header. */
  async download(url, { timeoutMs = 120000 } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, {
        headers: { 'x-manus-api-key': this.apiKey() },
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ManusApiError('下载附件超时', 'timeout')
      }
      throw new ManusApiError(`下载附件失败：${error instanceof Error ? error.message : String(error)}`, 'network')
    } finally {
      clearTimeout(timer)
    }
  }

  // ------------------------------------------------------ result flow

  /**
   * Poll until the task stops / errors / waits, or the deadline passes.
   * Returns a summary (see summarizeMessages) plus `timedOut`.
   */
  async waitForResult(taskId, { maxWaitMs = 120000, pollIntervalMs = 4000, onPoll } = {}) {
    const deadline = Date.now() + maxWaitMs
    for (;;) {
      const { messages } = await this.listMessages(taskId, { limit: 50, order: 'desc' })
      const summary = summarizeMessages(messages)
      if (onPoll) onPoll(summary)
      if (summary.agentStatus === 'stopped' || summary.agentStatus === 'error' || summary.agentStatus === 'waiting') {
        return { ...summary, timedOut: false }
      }
      if (Date.now() >= deadline) return { ...summary, timedOut: true }
      await sleep(pollIntervalMs)
    }
  }
}

// ------------------------------------------------------------- helpers

/** Collapse task events into a compact summary. */
export function summarizeMessages(messages) {
  const summary = {
    agentStatus: null,
    waiting: null,
    brief: '',
    assistant: [],
    errors: [],
    structured: null,
  }
  for (const event of messages) {
    if (event.type === 'status_update' && event.status_update) {
      summary.agentStatus = event.status_update.agent_status
      if (event.status_update.brief) summary.brief = event.status_update.brief
      if (event.status_update.agent_status === 'waiting' && event.status_update.status_detail) {
        summary.waiting = event.status_update.status_detail
      }
    } else if (event.type === 'assistant_message' && event.assistant_message) {
      summary.assistant.push(event.assistant_message)
    } else if (event.type === 'error_message' && event.error_message) {
      summary.errors.push(event.error_message)
    } else if (event.type === 'structured_output_result' && event.structured_output_result) {
      summary.structured = event.structured_output_result
    }
  }
  return summary
}

/** Final answer text from a summary (assistant messages + errors + structured). */
export function renderResultText(summary) {
  const parts = []
  for (const message of summary.assistant ?? []) {
    if (message.content && message.content.trim()) parts.push(message.content.trim())
  }
  if ((summary.errors ?? []).length > 0) {
    parts.push('错误：' + summary.errors.map((error) => error.content ?? '').join('\n'))
  }
  if (summary.structured) {
    parts.push('结构化输出：' + JSON.stringify(summary.structured.value ?? null, null, 2))
  }
  return parts.join('\n\n')
}

/** De-duplicated attachment list from a summary. */
export function collectAttachments(summary) {
  const seen = new Map()
  for (const message of summary.assistant ?? []) {
    for (const attachment of message.attachments ?? []) {
      if (!attachment.url) continue
      if (!seen.has(attachment.url)) {
        seen.set(attachment.url, {
          filename: attachment.filename ?? 'attachment',
          url: attachment.url,
          contentType: attachment.content_type ?? null,
          type: attachment.type ?? 'file',
        })
      }
    }
  }
  return [...seen.values()]
}

/** Manus webapp base for opening a task in the browser. */
const MANUS_WEBAPP_BASE = 'https://manus.im/app'

/**
 * Build a Manus webapp deep-link for one task (and optional preview anchors).
 * @param taskId - the Manus task ID.
 * @param opts.eventId - the tool_used action_id that produced the file (optional).
 * @param opts.sandboxPath - the absolute path on the Manus sandbox VM (optional; not exposed by the API today).
 */
export function buildPreviewUrl(taskId, { eventId, sandboxPath } = {}) {
  const url = new URL(`${MANUS_WEBAPP_BASE}/${taskId}`)
  if (eventId) url.searchParams.set('previewEventId', eventId)
  if (sandboxPath) url.searchParams.set('previewSandboxPath', sandboxPath)
  return url.toString()
}

/**
 * Find the most recent tool_used action_id at or before the given message index
 * (assumes `messages` are in ascending chronological order). Returns null when
 * no preceding tool event exists.
 */
function latestToolEventIdBefore(messages, messageIndex) {
  for (let i = messageIndex - 1; i >= 0; i--) {
    const event = messages[i]
    if (event?.type === 'tool_used' && event.tool_used?.action_id) {
      return event.tool_used.action_id
    }
  }
  return null
}

/**
 * De-duplicated attachment list with a Manus preview URL per attachment.
 *
 * Walks the verbose message history in chronological order so each
 * assistant_message is paired with the most recent preceding tool_used
 * action (which is usually the agent step that produced the file). The
 * returned `preview_url` is a `https://manus.im/app/<task_id>?previewEventId=…`
 * link that opens the Manus webapp directly on that step.
 */
export function collectAttachmentsWithPreview(messages, taskId) {
  const list = Array.isArray(messages) ? messages : []
  const seen = new Map()
  for (let i = 0; i < list.length; i++) {
    const event = list[i]
    if (event?.type !== 'assistant_message') continue
    const inner = event.assistant_message
    if (!inner?.attachments) continue
    const previewEventId = latestToolEventIdBefore(list, i)
    for (const attachment of inner.attachments) {
      if (!attachment?.url) continue
      if (seen.has(attachment.url)) continue
      seen.set(attachment.url, {
        filename: attachment.filename ?? 'attachment',
        url: attachment.url,
        contentType: attachment.content_type ?? null,
        type: attachment.type ?? 'file',
        preview_url: taskId ? buildPreviewUrl(taskId, { eventId: previewEventId }) : null,
      })
    }
  }
  return [...seen.values()]
}

/** Sanitize an attachment filename for the local disk. */
export function safeFilename(name) {
  const cleaned = basename(String(name ?? '').replace(/[\\/:*?"<>|]/g, '_')).trim()
  return cleaned || 'attachment'
}

/**
 * Download one attachment into `dir`; returns the local path.
 * Throws ManusApiError on failure.
 */
export async function downloadAttachment(client, attachment, dir) {
  mkdirSync(dir, { recursive: true })
  const target = join(dir, safeFilename(attachment.filename))
  const response = await client.download(attachment.url)
  if (!response.ok) {
    throw new ManusApiError(
      `下载附件失败（HTTP ${response.status}）：${attachment.filename}`,
      `http_${response.status}`,
    )
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  writeFileSync(target, buffer)
  return target
}
