# dsh-manus

把 **Manus** 接进 DSH 的插件：用你自己的 Manus API Key（官方 [open.manus.im](https://open.manus.im/docs/v2/introduction) v2 API）在聊天里直接给 Manus 发指令，把它的成果（最终答复 + 附件文件）拿回本机。让 DSH 智能体随时调度 Manus。

## 功能

- **9 个 agent 工具**（聊天里直接可用）：
  | 工具 | 作用 |
  | --- | --- |
  | `manus_run` | 把任务指令发给 Manus，等待完成并把最终答复 + 附件拿回来（最常用） |
  | `manus_create` | 只创建任务，立即返回 `task_id`（异步长任务） |
  | `manus_poll` | 查询任务当前状态与最新消息 |
  | `manus_result` | 取回完整结果，可把附件下载到本机目录 |
  | `manus_reply` | 多轮追问 / 回答 Manus 的提问（`messageAskUser`） |
  | `manus_tasks` | 列出最近任务（找历史任务 ID） |
  | `manus_stop` | 停止运行中的任务 |
  | `manus_credits` | 查剩余积分余额 |
  | `manus_config` | 查看/设置 API Key（绝不回显明文） |
- **侧边栏「Manus」面板**：配置 API Key、看积分、发任务并实时轮询进度、查看结果、下载附件、浏览最近任务。
- 系统提示自动注入，agent 知道何时该用 Manus。

## 准备 API Key

1. 登录 [manus.im](https://manus.im) → 账户设置 → **API 设置 / API Integration** → **Create API Key**。
2. 复制 Key（只显示一次）。
3. 两种方式配置（任一即可，环境变量优先）：
   - 侧边栏 → **Manus** 面板 → 粘贴到输入框 → 保存 Key（存到 `~/.dsh/manus.json`，权限 0600）；
   - 或设置环境变量 `MANUS_API_KEY`。

## 安装

插件源码即本目录。挂到 web profile：

```bash
# 1. 让插件及其依赖可解析（在插件目录安装依赖）
cd dsh-manus && pnpm install

# 2. 把插件链接进 web profile 的 node_modules
#    （Windows：以管理员身份创建 junction，或直接在
#      C:\Users\<你>\.dsh\profiles\web\node_modules\dsh-manus 建符号链接指向本目录）

# 3. 在 ~/.dsh/profiles/web/cordis.patch.yml 追加：
#    - insert:
#        - id: manus
#          name: 'dsh-manus'

# 4. 重启 dsh web 服务（或保存 cordis.patch.yml 触发 HMR）
```

## 使用示例

- 聊天里说：*「让 Manus 调研一下本周 A 股具身智能板块，输出 Top5 标的分析，结果放到 D:\study\AI\manus-out」*
  agent 会调用 `manus_credits` → `manus_run`，完成后把答复与附件（如有）下载到指定目录。
- 大任务用：*「manus_create 建一个任务：爬取并整理 100 个网页的标题，然后每 30 秒 manus_poll 一次，完成后再 manus_result 取回全部结果」*。

## 安全与限制

- **真实消耗积分**：Manus 任务按你的订阅/积分扣费，执行前先 `manus_credits` 确认余额。
- API Key 存 `~/.dsh/manus.json`（0600），或环境变量；任何界面都只显示掩码，不返回明文。
- 路由 `loopback-only`：只有本机（127.0.0.1）可访问 `/api/dsh-manus/*`，避免局域网暴露。
- 任务耗时不定，`manus_run` 默认最多等 60 秒，超时后任务仍在后台运行，可继续轮询。
- 附件默认在 **浏览器新窗口打开 manus.im 预览**（`https://manus.im/app/<task_id>?previewEventId=…`）：插件从 verbose 任务消息里把每个 `assistant_message` 附件和最近的 `tool_used` 关联，定位到产生该文件的步骤。侧边栏每个附件链接默认跳预览，旁边仍有「⬇」走原下载代理；agent 工具输出里同时给出预览链接与 CDN URL，便于直接复制。
- 附件下载依赖 Manus 文件 CDN 的可用性；图片/PDF/PPT/Excel 等均可下载。

## 技术说明

- 零运行时外部依赖（host 仅依赖 `@deepseek-ai/cordis` 与 `@deepseek-ai/dsh-tools`，用 Node ≥18 内置 `fetch`）。
- client 为纯 DOM 实现，不依赖 React，通过 `window.__ModuleLoader__.load` 契约挂载。
- API 全部走官方 v2：`task.create` / `task.listMessages` / `task.detail` / `task.list` / `task.sendMessage` / `task.stop` / `usage.availableCredits`。
