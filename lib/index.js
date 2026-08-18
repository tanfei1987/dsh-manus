/**
 * dsh-manus — host half.
 *
 * Mounts the Manus engine (official open.manus.im v2 API), the /api/dsh-manus
 * route family, the agent tools (manus_run, manus_create, manus_poll,
 * manus_result, manus_reply, manus_tasks, manus_stop, manus_credits,
 * manus_config), and a system-prompt announcement. The browser half
 * (./client) renders the sidebar Manus panel. API key comes from
 * ~/.dsh/manus.json (0600) or the MANUS_API_KEY environment variable.
 */

import { ManusClient } from './manus.js'
import { makeRoutes } from './routes.js'
import { ManusStore } from './store.js'
import { buildManusTools } from './tools.js'

/** Stable cordis plugin name. */
export const name = 'manus'

/** Services required before the Manus surfaces can mount. */
export const inject = ['webServer', 'tools', 'systemPrompt']

/** Model-facing announcement: plugin presence, capabilities, and limits. */
export const MANUS_GUIDANCE = '本机已安装 dsh-manus 插件（Manus 集成）：侧边栏「Manus」入口；用你自己的 Manus API Key 通过官方 API（open.manus.im v2）调用 Manus。能力：manus_run 把任务指令发给 Manus 并等待拿回最终答复与附件；manus_create 创建异步任务；manus_poll 轮询状态；manus_result 取回完整结果，附件默认返回 manus.im 浏览器预览链接（https://manus.im/app/<task_id>?previewEventId=…），需要下载到本机时传 output_dir；manus_reply 多轮追问/回答 Manus 的提问；manus_tasks 列出最近任务；manus_stop 停止任务；manus_credits 查剩余积分；manus_config 查看/设置 API Key（存 ~/.dsh/manus.json，权限 0600，也可用环境变量 MANUS_API_KEY）。重要限制：Manus 任务真实消耗用户账户积分，执行大任务前先 manus_credits 确认余额；任务较长时优先 manus_create + manus_poll 异步跟进，避免长时间阻塞；附件下载目录需用户确认。用户提到「Manus / 用 Manus 帮我做 / 让 Manus 调研」时即指本插件，请据此协作。'

/**
 * Mount the Manus engine, routes, tools, and announcement.
 * @param ctx - host plugin context carrying webServer/tools/systemPrompt.
 * @param config - plugin config ({ enabled?, announceToAgent? }).
 */
export function apply(ctx, config = {}) {
  const enabled = config.enabled !== false
  const announce = config.announceToAgent !== false

  const store = new ManusStore()
  const client = new ManusClient(store)

  const { routes } = makeRoutes({ store, client })
  const tools = buildManusTools(client, store)

  // Routes + tools + announcement, disposed together on teardown.
  ctx.effect(() => {
    if (!enabled) return
    const disposers = [
      ...routes.map((route) => ctx.webServer.register(route)),
      ...tools.map((tool) => ctx.tools.register(tool)),
    ]
    if (announce) {
      disposers.push(ctx.systemPrompt.section({
        name: 'plugin:dsh-manus',
        order: 150,
        text: MANUS_GUIDANCE,
      }))
    }
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'dsh-manus: surfaces')
}
