import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ManusClient } from 'file:///D:/study/AI/dsh-manus/lib/manus.js';
import { ManusStore } from 'file:///D:/study/AI/dsh-manus/lib/store.js';

const client = new ManusClient(new ManusStore());
const taskId = '6Pe9PbVfBD6ZjAWdFTRq7H';
const outputDir = 'D:/study/AI/manus-out';
mkdirSync(outputDir, { recursive: true });

// 1) Try slides_format=pptx first (auto-converts HTML slides to PowerPoint)
for (const format of ['pptx', 'html']) {
  console.log(`\n===== slides_format=${format} =====`);
  try {
    const { messages } = await client.listMessages(taskId, { limit: 200, order: 'desc', slides_format: format });
    const seen = new Set();
    let count = 0;
    for (const m of messages) {
      if (m.type === 'assistant_message' && m.assistant_message?.attachments) {
        for (const a of m.assistant_message.attachments) {
          if (a?.url && !seen.has(a.url)) {
            seen.add(a.url);
            count++;
            console.log(`- [${a.type}] ${a.filename ?? '(无文件名)'} content_type=${a.content_type ?? '?'}`);
            console.log(`  ${a.url.slice(0, 180)}...`);
            // Download it with the right extension.
            const ext = pickExtension(a, format);
            const target = join(outputDir, (a.filename ?? 'slides') + ext);
            const res = await client.download(a.url);
            if (!res.ok) { console.log(`  ✗ HTTP ${res.status}`); continue; }
            const buf = Buffer.from(await res.arrayBuffer());
            const fs = await import('node:fs');
            fs.writeFileSync(target, buf);
            console.log(`  ✓ 已下载 ${buf.length} bytes -> ${target}`);
          }
        }
      }
    }
    if (count === 0) console.log('  无附件');
  } catch (e) {
    console.log('  ERR:', e.message);
  }
}

function pickExtension(a, format) {
  const urlExt = (a.url.split('?')[0].match(/\.([a-zA-Z0-9]+)$/) || [])[1];
  if (urlExt) return '.' + urlExt;
  const ct = a.content_type ?? '';
  if (ct.includes('pptx')) return '.pptx';
  if (ct.includes('pdf')) return '.pdf';
  if (format === 'pptx') return '.pptx';
  if (format === 'html') return '.html';
  return '.json';
}
