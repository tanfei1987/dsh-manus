import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ManusClient } from 'file:///D:/study/AI/dsh-manus/lib/manus.js';
import { ManusStore } from 'file:///D:/study/AI/dsh-manus/lib/store.js';

const slidesDir = 'D:/study/AI/manus-out/slides';
mkdirSync(slidesDir, { recursive: true });

const source = 'D:/study/AI/manus-out/未来五年（2025–2030）半导体行业发展趋势.json';
const data = JSON.parse(await readFile(source, 'utf8'));

// Slide order from the outline (id + title), then map to image URLs.
const order = data.outline.map((o) => ({ id: o.id, title: o.title }));
console.log(`outline slides: ${order.length}, images: ${Object.keys(data.images ?? {}).length}`);

const client = new ManusClient(new ManusStore());
let ok = 0;
let fail = 0;
for (let i = 0; i < order.length; i++) {
  const { id, title } = order[i];
  const url = data.images?.[id];
  if (!url) { console.log(`✗ 无图: ${id}`); fail++; continue; }
  const padded = String(i + 1).padStart(2, '0');
  const filename = `${padded}_${id}.webp`;
  try {
    const res = await client.download(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(slidesDir, filename), buf);
    console.log(`✓ ${filename} (${buf.length} bytes) — ${title ?? ''}`);
    ok++;
  } catch (e) {
    console.log(`✗ ${id}: ${e.message}`);
    fail++;
  }
}
console.log(`done: ok=${ok} fail=${fail}`);
