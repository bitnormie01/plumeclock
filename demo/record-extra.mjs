// Extra footage after the live run: the final on-chain state of IRQ_S_067 (resolved) on the real dashboard.
// Frames go to raw/<run>/extra. Nothing is staged: the page reads the same Base Sepolia deployment.
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RUN = process.env.REC_RUN ?? 'run1';
const dir = path.resolve('raw', RUN, 'extra');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = performance.now();
const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'plumeclock-extra-')), {
  headless: true,
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.locator('ul.stats').waitFor();
await page.locator('[data-testid=ticket-row]').first().waitFor();
await sleep(2000);
// Select the resolved ticket, then scroll past the header/map so the end-state stats line is not in frame
// (this footage plays in S3, before the slash scene).
await page
  .locator('circle.ticket-marker', { has: page.locator('title', { hasText: 'IRQ_S_067' }) })
  .dispatchEvent('click');
await page.locator('aside.ticket-panel h2', { hasText: 'IRQ_S_067' }).waitFor();
await page.evaluate(() => window.scrollTo(0, 790));
await sleep(500);
const frames = [];
let n = 0;
await page.screencast.start({
  size: { width: 1920, height: 1080 },
  quality: 92,
  onFrame: ({ data }) => {
    const file = `f${String(n++).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, file), data);
    frames.push({ file, t: Math.round(performance.now() - t0) });
  },
});
await sleep(3500);
const body = await page.evaluate(() => document.body.innerText);
console.log('IRQ resolved shown:', /Resolved/.test(body));
const rowTop = await page.evaluate(() => {
  const r = [...document.querySelectorAll('[data-testid=ticket-row]')].find((x) => x.textContent.includes('IRQ_S_067'));
  return r.getBoundingClientRect().top + window.scrollY;
});
await page.evaluate(
  (target) =>
    new Promise((resolve) => {
      const start = window.scrollY;
      const t = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t) / 5000);
        window.scrollTo(0, start + (target - start) * (k * (2 - k)));
        if (k < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    }),
  Math.max(0, rowTop - 700),
);
await sleep(5500);
await page.screenshot({ path: path.join(dir, '..', 'extra_IRQ.png') });
await page.screencast.stop();
fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify(frames));
console.log('extra frames', frames.length);
await ctx.close();
process.exit(0);
