// Re-records the Blockscout pages of the real slash tx and the MitigationFund (no new transactions).
// Cosmetic only: third-party "Sponsored" ad banners are hidden for the whole recording; chain data is untouched.
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RUN = process.env.REC_RUN ?? 'run1';
const raw = path.resolve('raw', RUN);
const log = fs.readFileSync(path.join(raw, 'run.log'), 'utf8');
const slashUrl = log.match(/\[4\] Slash KAZ_S_003.*?(https?:\/\/\S+)/)[1];
const dep = JSON.parse(fs.readFileSync(path.resolve('..', 'public', 'deployments', 'base-sepolia.json'), 'utf8'));
const fundUrl = `${dep.explorerUrl}/address/${dep.mitigationFund}`;
const dir = path.join(raw, 'blockscout');
fs.rmSync(dir, { recursive: true, force: true });
fs.rmSync(path.join(raw, 'blockscout_full.mp4'), { force: true });
fs.mkdirSync(dir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = performance.now();
const now = () => Math.round(performance.now() - t0);

const hideScript = () => {
  const hide = () => {
    document.querySelectorAll('img[src*="adbutler"], iframe[src*="adbutler"]').forEach((i) => {
      i.style.visibility = 'hidden';
      i.style.height = '0';
    });
    for (const e of document.querySelectorAll('*')) {
      if (e.children.length === 0 && e.textContent.trim() === 'Sponsored' && e.parentElement?.parentElement) {
        e.parentElement.parentElement.style.display = 'none';
        const grid = e.parentElement.parentElement.parentElement;
        const img = document.querySelector('img[src*="adbutler"]');
        if (grid && img) {
          let cell = img;
          while (cell.parentElement && cell.parentElement !== grid) cell = cell.parentElement;
          if (cell.parentElement === grid) cell.style.display = 'none';
        }
      }
      if (e.children.length <= 3 && /^Sponsored:/.test(e.textContent.trim()) && e.textContent.length < 160) {
        e.style.visibility = 'hidden';
      }
    }
  };
  setInterval(hide, 120);
};

const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'plumeclock-bs-')), {
  headless: true,
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
await ctx.addInitScript(hideScript);
const page = ctx.pages()[0] ?? (await ctx.newPage());
const frames = [];
let n = 0;
const marks = {};
await page.goto(slashUrl, { waitUntil: 'domcontentloaded' });
await page.getByText('Success').first().waitFor({ timeout: 60000 });
await sleep(1500);
await page.screencast.start({
  size: { width: 1920, height: 1080 },
  quality: 92,
  onFrame: ({ data }) => {
    const file = `f${String(n++).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, file), data);
    frames.push({ file, t: now() });
  },
});
marks.tx = now();
const txBody = await page.evaluate(() => document.body.innerText);
const txHash = slashUrl.split('/tx/')[1];
console.log('tx page: Success', /Success/.test(txBody), '| hash matches run.log', txBody.includes(txHash), '| method slash', /slash/.test(txBody));
await page.screenshot({ path: path.join(raw, 'bs_tx.png') });
await sleep(10000);
await page.goto(fundUrl, { waitUntil: 'domcontentloaded' });
await page.getByText('MitigationFund').first().waitFor({ timeout: 60000 });
await sleep(1500);
marks.fund = now();
const fundBody = await page.evaluate(() => document.body.innerText);
console.log('fund page: 0.001 ETH', /0\.001\s*ETH/.test(fundBody));
await page.screenshot({ path: path.join(raw, 'bs_fund.png') });
await sleep(7000);
marks.end = now();
await page.screencast.stop();
fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify(frames));
fs.writeFileSync(path.join(raw, 'bs_marks.json'), JSON.stringify({ first: frames[0].t, ...marks }));
console.log('bs marks (ms, process clock):', JSON.stringify(marks), 'first frame', frames[0].t);
await ctx.close();
process.exit(0);
