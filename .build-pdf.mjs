// Build a PDF of all 20 rendered slides via headless Chromium.
// Images are inlined as base64 data URLs so nothing depends on file:// access.
import { readdirSync, readFileSync } from 'node:fs';
import { chromium } from 'file:///C:/nvm4w/nodejs/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';

const slidesDir = 'D:/study/AI/manus-out/slides';
const outPdf = 'D:/study/AI/manus-out/未来五年（2025-2030）半导体行业发展趋势.pdf';
const files = readdirSync(slidesDir).filter((f) => f.endsWith('.webp')).sort();
console.log('slides:', files.length);

const pages = files.map((f) => {
  const buf = readFileSync(`${slidesDir}/${f}`);
  const b64 = buf.toString('base64');
  return `<section style="width:13.333in;height:7.5in;margin:0;page-break-after:always;display:block;overflow:hidden;">
    <img src="data:image/webp;base64,${b64}" style="width:13.333in;height:7.5in;display:block;">
  </section>`;
}).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>*{margin:0;padding:0}@page{size:13.333in 7.5in;margin:0}</style>
</head><body>${pages}</body></html>`;

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Users/admin/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.setContent(html, { waitUntil: 'load' });
// Let webp images decode.
await page.waitForTimeout(1500);
await page.pdf({
  path: outPdf,
  preferCSSPageSize: true,
  printBackground: true,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
});
await browser.close();
console.log('saved:', outPdf, 'bytes:', readFileSync(outPdf).length);
