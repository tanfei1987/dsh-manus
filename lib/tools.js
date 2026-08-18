/**
 * dsh-manus — agent tools.
 *
 * Every tool talks to the same ManusClient the web panel uses, so a task
 * started from chat is immediately visible in the GUI (and vice versa). The
 * family:
 *
 *   manus_credits   remaining credit balance + where the API key comes from
 *   manus_run       create a task and (optionally) wait for the final result
 *   manus_create    fire-and-forget task creation (async workflow)
 *   manus_poll      one-shot status + newest messages of a task
 *   manus_result    full result of a task (messages + attachments, optional download)
 *   manus_reply     send a follow-up message / answer the agent's question
 *   manus_tasks     list recent tasks
 *   manus_stop      stop a running task
 *   manus_config    (re)configure the API key / base URL from chat
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  collectAttachments,
  collectAttachmentsWithPreview,
  downloadAttachment,
  ManusApiError,
  renderResultText,
  summarizeMessages,
} from './manus.js'
import { keySource, maskKey } from './store.js'

/** Fetch verbose ascending messages for preview-URL correlation. Best effort. */
async function fetchPreviewMessages(client, taskId) {
  try {
    const result = await client.listMessages(taskId, { limit: 200, order: 'asc', verbose: true })
    return Array.isArray(result.messages) ? result.messages : []
  } catch {
    return []
  }
}

/** One text content block (the only render shape these tools emit). */
function text(value) {
  return [{ type: 'text', text: value }]
}

/** Agent profile choices (task.create supports these on paid accounts). */
const AGENT_PROFILES = ['manus-1.6', 'manus-1.6-lite', 'manus-1.6-max']

/** Shared create options schema fields (kept in sync across tools). */
const createParams = {
  prompt: { type: 'string', required: true, description: '要交给 Manus 执行的任务指令（自然语言，最多约 5000 token）。' },
  title: { type: 'string', description: '任务标题；缺省时 Manus 自动生成。' },
  agent_profile: {
    type: 'string',
    enum: AGENT_PROFILES,
    description: 'Manus 智能体档位：manus-1.6（标准，默认）/ manus-1.6-lite（轻量快）/ manus-1.6-max（最强，耗积分更多）。',
  },
  locale: { type: 'string', description: '输出语言，如 zh-CN / en / ja。默认跟随账户设置。' },
  interactive_mode: { type: 'boolean', description: 'true 时 Manus 可暂停追问问题；false（默认）时直接尽力执行不问。' },
}

/** Shared attachment download output fields. */
const attachmentSchema = {
  type: 'array',
  required: true,
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      filename: { type: 'string', required: true },
      url: { type: 'string', required: true },
      type: { type: 'string', required: true },
      contentType: { type: 'string', description: '附件的 MIME 类型（可为空）。' },
      preview_url: {
        type: 'string',
        description: '在 manus.im 网页端打开该附件的预览链接（https://manus.im/app/<task_id>?previewEventId=…）。点击会跳到浏览器新窗口。',
      },
      local_path: { type: 'string', description: '已下载到本机的路径（请求了 output_dir 时）' },
      local_error: { type: 'string', description: '下载失败原因（请求了 output_dir 时）' },
    },
  },
}

/** Build the common "result" output object for run/reply/result tools. */
const resultOutputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true, description: '任务是否正常结束（非 error）。' },
    task_id: { type: 'string', required: true },
    task_url: { type: 'string', required: true, description: '在 manus.im 网页端查看该任务的链接。' },
    task_title: { type: 'string' },
    status: { type: 'string', required: true, description: 'created / running / stopped / waiting / error / timeout' },
    agent_status: { type: 'string', required: true },
    timed_out: { type: 'boolean', required: true, description: '等待超时（任务仍在后台运行，可继续 manus_poll）。' },
    brief: { type: 'string', description: 'Manus 当前进度摘要。' },
    waiting: {
      type: 'object',
      additionalProperties: true,
      description: '任务等待用户确认/输入时的详情（waiting_for_event_type、waiting_description 等）。',
    },
    result: { type: 'string', required: true, description: 'Manus 的最终答复文本。' },
    attachments: attachmentSchema,
    credit_usage: { type: 'integer', description: '本任务消耗的积分（若已结算）。' },
    error: { type: 'string', description: '任务失败原因。' },
  },
}

/** Shared renderer for run/reply/result values. */
function renderResult(args, value) {
  const lines = []
  lines.push(`task_id: ${value.task_id}`)
  lines.push(`task_url: ${value.task_url}`)
  lines.push(`status: ${value.status}${value.timed_out ? ' (等待超时，任务仍在后台运行)' : ''}`)
  if (value.brief) lines.push(`进度: ${value.brief}`)
  if (value.waiting) {
    lines.push(`等待用户: ${value.waiting.waiting_description ?? JSON.stringify(value.waiting)}`)
  }
  if (value.result) lines.push('--- Manus 回复 ---\n' + value.result)
  if (value.credit_usage !== undefined && value.credit_usage !== null) {
    lines.push(`本次消耗积分: ${value.credit_usage}`)
  }
  if (value.attachments && value.attachments.length > 0) {
    lines.push('--- 附件（点击在 manus.im 预览） ---')
    for (const attachment of value.attachments) {
      const local = attachment.local_path ? ` (已下载: ${attachment.local_path})` : ''
      const failed = attachment.local_error ? ` (下载失败: ${attachment.local_error})` : ''
      const preview = attachment.preview_url ?? value.task_url
      lines.push(`- ${attachment.filename}${local}${failed}\n  预览: ${preview}\n  CDN: ${attachment.url}`)
    }
  }
  if (value.error) lines.push(`任务失败: ${value.error}`)
  return text(lines.join('\n'))
}

/** Shared "download attachments if output_dir" helper. */
async function maybeDownload(client, attachments, outputDir) {
  if (!outputDir || attachments.length === 0) return attachments
  const downloaded = []
  for (const attachment of attachments) {
    try {
      const localPath = await downloadAttachment(client, attachment, outputDir)
      downloaded.push({ ...attachment, local_path: localPath })
    } catch (error) {
      downloaded.push({ ...attachment, local_error: error instanceof Error ? error.message : String(error) })
    }
  }
  return downloaded
}

/** Attach credit usage when available (best effort). */
async function creditOf(client, taskId) {
  try {
    const detail = await client.taskDetail(taskId)
    return detail.task?.credit_usage
  } catch {
    return undefined
  }
}

/** Shared "wait + package the result" step. */
async function settleResult(client, taskId, { wait, timeoutMs, outputDir }) {
  if (!wait) {
    return {
      ok: true,
      task_id: taskId,
      task_url: `https://manus.im/app/${taskId}`,
      status: 'created',
      agent_status: 'running',
      timed_out: false,
      result: '',
      attachments: [],
    }
  }
  const summary = await client.waitForResult(taskId, { maxWaitMs: timeoutMs ?? 60000 })
  // Verbose ascending messages carry the tool_used events we need to derive
  // per-attachment preview URLs (https://manus.im/app/<task_id>?previewEventId=…).
  // Best-effort: fall back to a non-preview list when the verbose fetch fails.
  const previewMessages = await fetchPreviewMessages(client, taskId)
  const attachments = await maybeDownload(
    client,
    previewMessages.length > 0
      ? collectAttachmentsWithPreview(previewMessages, taskId)
      : collectAttachments(summary),
    outputDir,
  )
  const result = renderResultText(summary)
  const creditUsage = await creditOf(client, taskId)
  const failed = summary.agentStatus === 'error'
  const value = {
    ok: !failed,
    task_id: taskId,
    task_url: `https://manus.im/app/${taskId}`,
    status: summary.timedOut ? 'timeout' : (summary.agentStatus ?? 'unknown'),
    agent_status: summary.agentStatus ?? 'unknown',
    timed_out: summary.timedOut,
    result,
    attachments,
    ...(creditUsage !== undefined ? { credit_usage: creditUsage } : {}),
    ...(failed ? { error: (summary.errors[0]?.content) ?? 'Manus 任务执行出错' } : {}),
  }
  // Undefined-valued properties are rejected by the tool bridge — spread conditionally.
  if (summary.brief) value.brief = summary.brief
  if (summary.waiting) value.waiting = summary.waiting
  return value
}

// ------------------------------------------------------------- credits

/** The credit-balance tool. */
export function manusCreditsTool(client, store) {
  return defineTool({
    name: 'manus_credits',
    description: '查询 Manus 账户当前可用积分余额（total_credits 为可消费总额）、积分来源构成与下次自动刷新时间，以及 API Key 是否已配置。' +
      'Manus 任务会真实消耗积分，动手前先查余额。',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          configured: { type: 'boolean', required: true, description: '是否已配置 API Key。' },
          key_source: { type: 'string', required: true, description: 'env=环境变量 / file=配置文件 / none=未配置' },
          key_hint: { type: 'string', description: 'Key 掩码，仅用于确认是哪一个 Key。' },
          total_credits: { type: 'integer', description: '可消费总积分（权威值）。' },
          periodic_credits: { type: 'integer', description: '订阅周期剩余积分。' },
          addon_credits: { type: 'integer', description: '额外购买的积分包余额。' },
          free_credits: { type: 'integer', description: '赠送/系统发放积分。' },
          refresh_credits: { type: 'integer', description: '自动刷新累计积分。' },
          max_refresh_credits: { type: 'integer', description: '每次刷新发放额度。' },
          next_refresh_time: { type: 'integer', description: '下次刷新时间（Unix 秒）。' },
          refresh_interval: { type: 'string', description: 'daily / weekly / 空' },
          pro_monthly_credits: { type: 'integer', description: '订阅月度积分额度。' },
          error: { type: 'string' },
        },
      },
      render: (_args, value) => {
        if (!value.ok) {
          return text(value.configured
            ? `查询积分失败：${value.error ?? '未知错误'}`
            : `Manus API Key 未配置（来源: ${value.key_source}）。请先在侧边栏「Manus」面板或环境变量 MANUS_API_KEY 配置。`)
        }
        const lines = [`可用积分: ${value.total_credits}`]
        if (value.periodic_credits !== undefined && value.periodic_credits !== null) lines.push(`周期积分: ${value.periodic_credits}`)
        if (value.addon_credits !== undefined && value.addon_credits !== null) lines.push(`积分包: ${value.addon_credits}`)
        if (value.free_credits !== undefined && value.free_credits !== null) lines.push(`赠送积分: ${value.free_credits}`)
        if (value.refresh_credits !== undefined && value.refresh_credits !== null && value.refresh_credits > 0) lines.push(`刷新积分: ${value.refresh_credits}`)
        if (value.next_refresh_time) {
          lines.push(`下次${value.refresh_interval ?? ''}刷新: ${new Date(value.next_refresh_time * 1000).toLocaleString('zh-CN')}`)
        }
        if (value.pro_monthly_credits) lines.push(`订阅月额度: ${value.pro_monthly_credits}`)
        lines.push(`Key 来源: ${value.key_source}${value.key_hint ? ` (${value.key_hint})` : ''}`)
        return text(lines.join('\n'))
      },
    },
    async execute() {
      const source = keySource(store)
      if (source === 'none') {
        return {
          ok: false,
          configured: false,
          key_source: 'none',
          key_hint: '',
        }
      }
      try {
        // Note: the real API returns the credit fields flat at the top level
        // (no `data` wrapper, despite the OpenAPI doc) — read it directly and
        // coerce numeric fields (next_refresh_time arrives as a string).
        const data = await client.availableCredits()
        const num = (value) => {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : 0
        }
        return {
          ok: true,
          configured: true,
          key_source: source,
          key_hint: maskKey(client.apiKey()),
          total_credits: num(data.total_credits),
          periodic_credits: num(data.periodic_credits),
          addon_credits: num(data.addon_credits),
          free_credits: num(data.free_credits),
          refresh_credits: num(data.refresh_credits),
          max_refresh_credits: num(data.max_refresh_credits),
          next_refresh_time: num(data.next_refresh_time),
          refresh_interval: typeof data.refresh_interval === 'string' ? data.refresh_interval : '',
          pro_monthly_credits: num(data.pro_monthly_credits),
        }
      } catch (error) {
        return {
          ok: false,
          configured: true,
          key_source: source,
          key_hint: maskKey(client.apiKey()),
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
  })
}

// ---------------------------------------------------------------- run

/** The one-shot "send to Manus and bring back the result" tool. */
export function manusRunTool(client) {
  return defineTool({
    name: 'manus_run',
    description: '把一段任务指令直接发给 Manus 执行，等待其完成后把最终答复（和附件）拿回来。' +
      '这是最常用的入口：用户说“让 Manus 帮我做 X / 用 Manus 调研 X”时用它。' +
      '任务会真实消耗 Manus 积分。可设置 structured_output_schema 让 Manus 返回指定 JSON 结构。',
    parameters: {
      ...createParams,
      wait: { type: 'boolean', description: 'true（默认）等待完成并返回结果；false 只创建任务立即返回 task_id。' },
      timeout_ms: { type: 'integer', description: '等待超时（毫秒），默认 60000，最大 300000。超时后任务仍在后台跑，可用 manus_poll 继续查。' },
      output_dir: { type: 'string', description: '把 Manus 生成的附件（文件/图片/PPT 等）下载到本机这个目录；留空则不下载。' },
      structured_output_schema: {
        type: 'json',
        description: '可选的 JSON Schema 对象：让 Manus 把最终结果按该结构输出（所有属性需 required、additionalProperties 必须 false）。',
      },
    },
    output: { schema: resultOutputSchema, render: renderResult },
    async execute(args) {
      const created = await client.createTask(args.prompt, {
        title: args.title,
        agent_profile: args.agent_profile,
        locale: args.locale,
        interactive_mode: args.interactive_mode,
        structured_output_schema: args.structured_output_schema,
      })
      const taskId = created.task_id
      return settleResult(client, taskId, {
        wait: args.wait !== false,
        timeoutMs: Math.min(args.timeout_ms ?? 60000, 300000),
        outputDir: args.output_dir,
      })
    },
  })
}

// -------------------------------------------------------------- create

/** The fire-and-forget task creation tool. */
export function manusCreateTool(client) {
  return defineTool({
    name: 'manus_create',
    description: '创建一个 Manus 任务并立即返回 task_id（不等待完成）。' +
      '适合长任务/异步流程：先用它拿到 task_id，之后用 manus_poll 轮询、manus_result 取最终结果。',
    parameters: {
      ...createParams,
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          task_id: { type: 'string', required: true },
          task_title: { type: 'string' },
          task_url: { type: 'string', required: true },
          status: { type: 'string', required: true },
        },
      },
      render: (_args, value) => text(
        `已创建 Manus 任务\n- task_id: ${value.task_id}\n- title: ${value.task_title ?? ''}\n- 网页查看: ${value.task_url}\n状态: ${value.status}（用 manus_poll 轮询、manus_result 取结果）`,
      ),
    },
    async execute(args) {
      const created = await client.createTask(args.prompt, {
        title: args.title,
        agent_profile: args.agent_profile,
        locale: args.locale,
        interactive_mode: args.interactive_mode,
      })
      return {
        ok: true,
        task_id: created.task_id,
        ...(created.task_title !== undefined ? { task_title: created.task_title } : {}),
        task_url: created.task_url ?? `https://manus.im/app/${created.task_id}`,
        status: 'created',
      }
    },
  })
}

// ---------------------------------------------------------------- poll

/** The one-shot status poll tool. */
export function manusPollTool(client) {
  return defineTool({
    name: 'manus_poll',
    description: '查询一个 Manus 任务的当前状态与最新消息（不等待）。' +
      'agent_status: running=进行中 / stopped=完成 / waiting=等待用户 / error=失败。' +
      '配合 manus_create 使用，或用来跟进超时的 manus_run。',
    parameters: {
      task_id: { type: 'string', required: true, description: 'Manus 任务 ID（manus_create / manus_run 返回的 task_id）。' },
      limit: { type: 'integer', description: '返回的最新消息条数，默认 20。' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          task_id: { type: 'string', required: true },
          status: { type: 'string', required: true },
          agent_status: { type: 'string', required: true },
          task_url: { type: 'string', required: true },
          brief: { type: 'string', description: 'Manus 当前进度摘要。' },
          last_assistant: { type: 'string', description: '最新一条 Manus 回复。' },
          waiting: {
            type: 'object',
            additionalProperties: true,
            description: '等待详情：waiting_for_event_type=messageAskUser 时应用 manus_reply 回答；其他类型需确认。',
          },
          credit_usage: { type: 'integer' },
          error: { type: 'string' },
        },
      },
      render: (_args, value) => {
        const lines = [`task_id: ${value.task_id}`, `状态: ${value.status}（agent_status=${value.agent_status}）`, `网页查看: ${value.task_url}`]
        if (value.brief) lines.push(`进度: ${value.brief}`)
        if (value.waiting) lines.push(`等待: ${value.waiting.waiting_description ?? JSON.stringify(value.waiting)}`)
        if (value.last_assistant) lines.push('最新回复:\n' + value.last_assistant)
        if (value.credit_usage !== undefined && value.credit_usage !== null) lines.push(`消耗积分: ${value.credit_usage}`)
        if (value.error) lines.push(`错误: ${value.error}`)
        return text(lines.join('\n'))
      },
    },
    async execute(args) {
      const detail = await client.taskDetail(args.task_id)
      const messages = await client.listMessages(args.task_id, { limit: args.limit ?? 20, order: 'desc' })
      const summary = summarizeMessages(messages.messages ?? [])
      const lastAssistant = summary.assistant[0]
      return {
        task_id: args.task_id,
        status: detail.task?.status ?? summary.agentStatus ?? 'unknown',
        agent_status: summary.agentStatus ?? detail.task?.status ?? 'unknown',
        task_url: detail.task?.task_url ?? `https://manus.im/app/${args.task_id}`,
        ...(summary.brief ? { brief: summary.brief } : {}),
        ...(lastAssistant?.content ? { last_assistant: lastAssistant.content } : {}),
        ...(summary.waiting ? { waiting: summary.waiting } : {}),
        ...(detail.task?.credit_usage !== undefined ? { credit_usage: detail.task.credit_usage } : {}),
        ...(summary.errors[0] ? { error: summary.errors[0].content } : {}),
      }
    },
  })
}

// -------------------------------------------------------------- result

/** The full-result extraction tool. */
export function manusResultTool(client) {
  return defineTool({
    name: 'manus_result',
    description: '取回一个已完成 Manus 任务的完整结果：Manus 的最终答复、全部附件列表；' +
      '指定 output_dir 可把附件下载到本机。structured_output 任务会附带 JSON 结果。',
    parameters: {
      task_id: { type: 'string', required: true, description: 'Manus 任务 ID。' },
      output_dir: { type: 'string', description: '把附件下载到本机这个目录；留空则不下载。' },
    },
    output: { schema: resultOutputSchema, render: renderResult },
    async execute(args) {
      // Verbose ascending messages carry the tool_used events we need to derive
      // per-attachment preview URLs (https://manus.im/app/<task_id>?previewEventId=…).
      const messagesResult = await client.listMessages(args.task_id, { limit: 200, order: 'asc', verbose: true })
      const messages = Array.isArray(messagesResult.messages) ? messagesResult.messages : []
      const summary = summarizeMessages(messages)
      const attachments = await maybeDownload(
        client,
        messages.length > 0 ? collectAttachmentsWithPreview(messages, args.task_id) : collectAttachments(summary),
        args.output_dir,
      )
      const creditUsage = await creditOf(client, args.task_id)
      const failed = summary.agentStatus === 'error'
      const value = {
        ok: !failed,
        task_id: args.task_id,
        task_url: `https://manus.im/app/${args.task_id}`,
        status: summary.agentStatus ?? 'unknown',
        agent_status: summary.agentStatus ?? 'unknown',
        timed_out: false,
        result: renderResultText(summary),
        attachments,
        ...(creditUsage !== undefined ? { credit_usage: creditUsage } : {}),
        ...(failed ? { error: summary.errors[0]?.content ?? 'Manus 任务执行出错' } : {}),
      }
      // Undefined-valued properties are rejected by the tool bridge — spread conditionally.
      if (summary.brief) value.brief = summary.brief
      if (summary.waiting) value.waiting = summary.waiting
      return value
    },
  })
}

// ---------------------------------------------------------------- reply

/** The follow-up message tool. */
export function manusReplyTool(client) {
  return defineTool({
    name: 'manus_reply',
    description: '给一个已有 Manus 任务发送后续消息（多轮对话），或回答 Manus 的追问（waiting_for_event_type=messageAskUser）。' +
      '也可用 task_id=agent-default-main_task 直接和 Manus 的默认 IM 智能体对话。',
    parameters: {
      task_id: { type: 'string', required: true, description: 'Manus 任务 ID，或 agent-default-main_task。' },
      prompt: { type: 'string', required: true, description: '要发送给 Manus 的后续指令/回答。' },
      wait: { type: 'boolean', description: 'true（默认）等待本轮完成；false 只发送立即返回。' },
      timeout_ms: { type: 'integer', description: '等待超时（毫秒），默认 60000，最大 300000。' },
      output_dir: { type: 'string', description: '把本轮附件下载到本机这个目录；留空则不下载。' },
      structured_output_schema: { type: 'json', description: '可选：让 Manus 本轮结束时按该 JSON Schema 输出结果。' },
    },
    output: { schema: resultOutputSchema, render: renderResult },
    async execute(args) {
      const sent = await client.sendMessage(args.task_id, args.prompt, {
        structured_output_schema: args.structured_output_schema,
      })
      return settleResult(client, args.task_id, {
        wait: args.wait !== false,
        timeoutMs: Math.min(args.timeout_ms ?? 60000, 300000),
        outputDir: args.output_dir,
      })
    },
  })
}

// ---------------------------------------------------------------- tasks

/** The task-list tool. */
export function manusTasksTool(client) {
  return defineTool({
    name: 'manus_tasks',
    description: '列出最近的 Manus 任务（标题、状态、消耗积分、时间），用于查找历史任务 ID 或检查后台任务进度。',
    parameters: {
      limit: { type: 'integer', description: '返回条数，默认 10，最大 50。' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          tasks: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                task_id: { type: 'string', required: true },
                title: { type: 'string', required: true },
                status: { type: 'string', required: true },
                task_type: { type: 'string', required: true },
                credit_usage: { type: 'integer' },
                created_at: { type: 'integer', required: true },
                task_url: { type: 'string', required: true },
              },
            },
          },
          error: { type: 'string' },
        },
      },
      render: (_args, value) => {
        if (!value.ok) return text(`查询任务列表失败：${value.error ?? '未知错误'}`)
        if (!value.tasks.length) return text('暂无任务记录。')
        const rows = value.tasks.map((task) => [
          task.task_id,
          task.title ?? '',
          task.status,
          task.credit_usage !== undefined && task.credit_usage !== null ? String(task.credit_usage) : '-',
          new Date((task.created_at ?? 0) * 1000).toLocaleString('zh-CN'),
        ].join(' | '))
        return text(['task_id | title | status | credits | created', '--- | --- | --- | --- | ---', ...rows].join('\n'))
      },
    },
    async execute(args) {
      try {
        const result = await client.listTasks({ limit: Math.min(args.limit ?? 10, 50) })
        const tasks = (result.tasks ?? []).map((task) => ({
          task_id: task.id,
          title: task.title ?? '',
          status: task.status ?? 'unknown',
          task_type: task.task_type ?? 'standard',
          ...(task.credit_usage !== undefined ? { credit_usage: task.credit_usage } : {}),
          created_at: task.created_at ?? 0,
          task_url: task.task_url ?? `https://manus.im/app/${task.id}`,
        }))
        return { ok: true, tasks }
      } catch (error) {
        return { ok: false, tasks: [], error: error instanceof Error ? error.message : String(error) }
      }
    },
  })
}

// ----------------------------------------------------------------- stop

/** The stop tool. */
export function manusStopTool(client) {
  return defineTool({
    name: 'manus_stop',
    description: '停止一个正在运行的 Manus 任务（停止后仍可用 manus_reply 继续对话）。',
    parameters: {
      task_id: { type: 'string', required: true, description: '要停止的 Manus 任务 ID。' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          task_id: { type: 'string', required: true },
          status: { type: 'string', required: true },
          error: { type: 'string' },
        },
      },
      render: (_args, value) => text(
        value.ok
          ? `已请求停止任务 ${value.task_id}`
          : `停止任务失败：${value.error ?? '未知错误'}`,
      ),
    },
    async execute(args) {
      try {
        await client.stopTask(args.task_id)
        return { ok: true, task_id: args.task_id, status: 'stopped' }
      } catch (error) {
        return { ok: false, task_id: args.task_id, status: 'unknown', error: error instanceof Error ? error.message : String(error) }
      }
    },
  })
}

// --------------------------------------------------------------- config

/** The configuration tool. */
export function manusConfigTool(client, store) {
  return defineTool({
    name: 'manus_config',
    description: '查看/设置 Manus API Key 与 API 地址。API Key 存于 ~/.dsh/manus.json（权限 0600），' +
      '或使用环境变量 MANUS_API_KEY（优先级更高）。绝不返回 Key 明文，只给掩码。',
    parameters: {
      api_key: { type: 'string', description: '要保存的新 API Key（留空则不改）。在 manus.im 网页端 → API 设置 → Create API Key 获取。' },
      base_url: { type: 'string', description: 'API 地址，默认 https://api.manus.ai。' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          configured: { type: 'boolean', required: true },
          key_source: { type: 'string', required: true },
          key_hint: { type: 'string', description: '当前生效 Key 的掩码。' },
          base_url: { type: 'string', required: true },
          error: { type: 'string' },
        },
      },
      render: (_args, value) => {
        if (!value.ok) return text(`配置失败：${value.error ?? '未知错误'}`)
        const lines = [
          `Manus API Key: ${value.configured ? '已配置' : '未配置'}（来源: ${value.key_source}${value.key_hint ? `，掩码 ${value.key_hint}` : ''}）`,
          `API 地址: ${value.base_url}`,
        ]
        if (!value.configured) lines.push('提示：在侧边栏「Manus」面板或本工具填写 API Key。')
        return text(lines.join('\n'))
      },
    },
    async execute(args) {
      const patch = {}
      if (args.api_key !== undefined && args.api_key !== '') patch.apiKey = args.api_key
      if (args.base_url !== undefined && args.base_url !== '') patch.baseUrl = args.base_url
      try {
        if (Object.keys(patch).length > 0) store.save(patch)
        const source = keySource(store)
        const config = store.load()
        return {
          ok: true,
          configured: source !== 'none',
          key_source: source,
          key_hint: maskKey(client.apiKey()),
          base_url: config.baseUrl,
        }
      } catch (error) {
        return {
          ok: false,
          configured: keySource(store) !== 'none',
          key_source: keySource(store),
          key_hint: maskKey(client.apiKey()),
          base_url: store.load().baseUrl,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
  })
}

/** All nine tools. */
export function buildManusTools(client, store) {
  return [
    manusCreditsTool(client, store),
    manusRunTool(client),
    manusCreateTool(client),
    manusPollTool(client),
    manusResultTool(client),
    manusReplyTool(client),
    manusTasksTool(client),
    manusStopTool(client),
    manusConfigTool(client, store),
  ]
}

export { ManusApiError }
