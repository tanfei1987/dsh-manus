import { ManusClient } from 'file:///D:/study/AI/dsh-manus/lib/manus.js';
import { ManusStore } from 'file:///D:/study/AI/dsh-manus/lib/store.js';

const client = new ManusClient(new ManusStore());
const { messages } = await client.listMessages('6Pe9PbVfBD6ZjAWdFTRq7H', { limit: 60, order: 'desc', verbose: true });
// Newest first; print the 15 newest events of interesting types.
let shown = 0;
for (const m of messages) {
  if (shown >= 15) break;
  if (m.type === 'status_update' && m.status_update) {
    console.log(`[状态] ${m.status_update.agent_status} | ${m.status_update.brief ?? ''}`);
    shown++;
  } else if (m.type === 'assistant_message' && m.assistant_message) {
    console.log(`[回复] ${String(m.assistant_message.content ?? '').slice(0, 300)}`);
    if (m.assistant_message.attachments?.length) {
      console.log(`  附件(${m.assistant_message.attachments.length}):`, m.assistant_message.attachments.map((a) => `${a.type}:${a.filename}`).join(', '));
    }
    shown++;
  } else if (m.type === 'tool_used' && m.tool_used) {
    console.log(`[工具] ${m.tool_used.tool} | ${String(m.tool_used.brief ?? m.tool_used.description ?? '').slice(0, 100)}`);
    shown++;
  } else if (m.type === 'structured_output_result') {
    console.log('[结构化]', JSON.stringify(m.structured_output_result));
    shown++;
  }
}
