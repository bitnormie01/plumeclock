// Records scenes S1-S6 of docs/demo/2026-10-20-demo-script.md from the real dashboard and Blockscout.
// Headless Chromium, 1920x1080, Playwright page.screencast JPEG frames -> raw/<run>/<segment>/*.jpg + frames.json.
// The demo runner is spawned here (its output never appears on camera). Nothing is staged: every state comes from the chain.
// Usage: REC_NET=anvil|base-sepolia REC_RUN=run1 node record.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const NET = process.env.REC_NET ?? 'base-sepolia';
const RUN = process.env.REC_RUN ?? 'run1';
const REPO = path.resolve('..');
const BASE = 'http://localhost:3000/';
const DASH = NET === 'anvil' ? `${BASE}?network=anvil` : BASE;
const OUT = path.resolve('raw', RUN);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = performance.now();
const now = () => Math.round(performance.now() - t0);
const marks = [];
const checks = [];
const mark = (name) => {
  marks.push({ name, t: now() });
  console.log(`[mark ${now()}ms] ${name}`);
};

// --- frame sinks -----------------------------------------------------------------------------
async function startSink(page, segment) {
  const dir = path.join(OUT, segment);
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  let n = 0;
  await page.screencast.start({
    size: { width: 1920, height: 1080 },
    quality: 92,
    onFrame: ({ data }) => {
      const file = `f${String(n++).padStart(6, '0')}.jpg`;
      fs.writeFileSync(path.join(dir, file), data);
      frames.push({ file, t: now() });
    },
  });
  return {
    async stop() {
      await page.screencast.stop();
      fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify(frames));
      return frames.length;
    },
  };
}

// --- demo runner (off camera) ------------------------------------------------------------------
const lines = [];
const waiters = [];
function pushLine(l) {
  lines.push(l);
  fs.appendFileSync(path.join(OUT, 'run.log'), `${l}\n`);
  for (const w of [...waiters]) {
    if (w.re.test(l)) {
      waiters.splice(waiters.indexOf(w), 1);
      w.resolve(l);
    }
  }
}
function waitLine(re, timeoutMs = 600000) {
  const hit = lines.find((l) => re.test(l));
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const w = { re, resolve };
    waiters.push(w);
    setTimeout(() => reject(new Error(`timeout waiting for ${re}`)), timeoutMs);
  });
}
function startRunner() {
  const args = ['run', 'demo', '--', '--network', NET, '--pause', '6000'];
  if (NET !== 'anvil') args.push('--fund');
  const child = spawn('npm', args, { cwd: REPO, env: process.env, shell: true });
  let buf = '';
  const onData = (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      pushLine(buf.slice(0, i).replace(/\r$/, ''));
      buf = buf.slice(i + 1);
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code) => pushLine(`RUNNER EXIT ${code}`));
  return child;
}

// --- dashboard helpers -----------------------------------------------------------------------
const bodyText = (page) => page.evaluate(() => document.body.innerText);
async function check(page, scene, label, re) {
  const text = await bodyText(page);
  const ok = re.test(text);
  checks.push({ scene, label, ok });
  console.log(`  [check ${scene}] ${ok ? 'PASS' : 'FAIL'}: ${label}`);
  return ok;
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
async function selectTicket(page, name) {
  await page
    .locator('circle.ticket-marker', { has: page.locator('title', { hasText: name }) })
    .dispatchEvent('click');
  await page.locator('aside.ticket-panel h2', { hasText: name }).waitFor({ timeout: 10000 });
}
async function smoothScroll(page, y, ms = 1500) {
  await page.evaluate(
    ([target, dur]) =>
      new Promise((resolve) => {
        const start = window.scrollY;
        const t = performance.now();
        const step = (n) => {
          const k = Math.min(1, (n - t) / dur);
          window.scrollTo(0, start + (target - start) * (k * (2 - k)));
          if (k < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    [y, ms],
  );
}


// Cosmetic only: hides third-party "Sponsored" ad banners on Blockscout. Transaction data is untouched.
async function hideAds(p) {
  await p.evaluate(() => {
    const lab = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Sponsored');
    const img = document.querySelector('img[src*="servedbyadbutler"]');
    if (lab && img) {
      const labelCell = lab.parentElement.parentElement;
      const grid = labelCell.parentElement;
      let valueCell = img;
      while (valueCell.parentElement && valueCell.parentElement !== grid) valueCell = valueCell.parentElement;
      labelCell.style.display = 'none';
      valueCell.style.display = 'none';
    }
    document.querySelectorAll('img[src*="servedbyadbutler"], iframe[src*="adbutler"]').forEach((i) => (i.style.visibility = 'hidden'));
  });
}

// --- main ------------------------------------------------------------------------------------
const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plumeclock-rec-'));
const ctx = await chromium.launchPersistentContext(userDir, {
  headless: true,
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
let runner;
try {
  await page.goto(DASH, { waitUntil: 'networkidle' });
  await page.locator('h1', { hasText: 'PlumeClock' }).waitFor();
  await page.locator('ul.stats').waitFor();
  await sleep(2500);
  const dash = await startSink(page, 'dash');

  // S1 - quiet dashboard before the run
  mark('S1_start');
  await check(page, 'S1', 'banner says simulated', /simulated/);
  await check(page, 'S1', '0 tickets opened', /0\s*tickets opened/);
  await sleep(6000);
  await page.getByLabel('Country response rates').check();
  await sleep(7000);
  await shot(page, 'S1');
  await page.getByLabel('Country response rates').uncheck();
  await sleep(2500);
  mark('S1_end');

  // S2-S4 - the live run
  mark('RUN_start');
  runner = startRunner();
  await waitLine(/\[setup\] Feeder posts snapshot root/);
  mark('root_posted');
  await waitLine(/\[1\] Open tickets/);
  mark('tickets_open');
  await sleep(5500);
  await selectTicket(page, 'KAZ_S_003');
  mark('S2_kaz_selected');
  await sleep(9000);
  await check(page, 'S2', '41 tickets opened', /41\s*tickets opened/);
  await check(page, 'S2', 'IMEO status text', /Notified – no response received/);
  await check(page, 'S2', 'CO2e 2.05 Mt', /2\.05 Mt/);
  await check(page, 'S2', 'operator simulated', /\(simulated\)/);
  await shot(page, 'S2');

  await waitLine(/\[2\] Operator A responds/);
  mark('A_responds');
  await sleep(5000);
  await selectTicket(page, 'IRQ_S_067');
  mark('S3_irq_selected');
  await waitLine(/\[3\] Resolve IRQ_S_067/);
  mark('A_resolved');
  await sleep(7000);
  await check(page, 'S3', 'IRQ_S_067 resolved', /Resolved/);
  await shot(page, 'S3');

  await selectTicket(page, 'KAZ_S_003');
  mark('S4_start');
  await shot(page, 'S4_countdown');
  await waitLine(/\[4\] Slash KAZ_S_003/);
  mark('slash_tx');
  await sleep(9000);
  await check(page, 'S4', 'Slashed to mitigation fund 0.001 ETH', /Slashed to mitigation fund: 0\.001 ETH/);
  await check(page, 'S4', '1 slashed in stats', /1\s*slashed/);
  await shot(page, 'S4');
  mark('S4_end');
  await waitLine(/DEMO OK/);

  // S5 - Blockscout (second page), then the dashboard's verify + triage
  const slashLine = lines.find((l) => /\[4\] Slash KAZ_S_003/.test(l));
  const slashUrl = slashLine.match(/https?:\/\/\S+/)?.[0];
  const deployment = JSON.parse(fs.readFileSync(path.join(REPO, 'public', 'deployments', `${NET}.json`), 'utf8'));
  const fundUrl = `${deployment.explorerUrl}/address/${deployment.mitigationFund}`;
  if (NET !== 'anvil') {
    const bp = await ctx.newPage();
    await bp.setViewportSize({ width: 1920, height: 1080 });
    await bp.goto(slashUrl, { waitUntil: 'domcontentloaded' });
    await bp.getByText('Success', { exact: false }).first().waitFor({ timeout: 60000 });
    await sleep(2500);
    await hideAds(bp);
    const bsink = await startSink(bp, 'blockscout');
    mark('S5_tx');
    await shot(bp, 'S5_tx');
    const ok = /Success/.test(await bodyText(bp)) && (await bodyText(bp)).includes(slashUrl.split('/tx/')[1].slice(0, 10));
    checks.push({ scene: 'S5', label: 'Blockscout tx Success + hash matches run.log', ok });
    await sleep(9000);
    await bp.goto(fundUrl, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await hideAds(bp);
    mark('S5_fund');
    await shot(bp, 'S5_fund');
    await sleep(6000);
    mark('S5_blockscout_end');
    await bsink.stop();
    await bp.close();
  }
  await selectTicket(page, 'KAZ_S_003');
  mark('S5_verify_start');
  await page.getByRole('button', { name: /Verify record/ }).click();
  await page.locator('[data-testid=verification]').waitFor({ timeout: 30000 });
  await sleep(2500);
  const vtxt = await page.locator('[data-testid=verification]').innerText();
  checks.push({ scene: 'S5', label: 'verification three checks, no X', ok: (vtxt.match(/✓/g) ?? []).length === 3 && !vtxt.includes('✗') });
  await shot(page, 'S5_verify');
  await sleep(5000);
  mark('S5_triage');
  await page.locator('[data-testid=notice]').scrollIntoViewIfNeeded();
  await sleep(6000);
  await shot(page, 'S5_triage');
  mark('S5_end');

  // S6 - final dashboard
  await smoothScroll(page, 0);
  await page.getByLabel('Country response rates').check();
  mark('S6_start');
  await sleep(4000);
  await check(page, 'S6', '1 resolved', /1\s*resolved/);
  await check(page, 'S6', '1 slashed', /1\s*slashed/);
  await shot(page, 'S6');
  await sleep(6000);
  await smoothScroll(page, 100000, 4500);
  await sleep(3500);
  await shot(page, 'S6_footer');
  mark('S6_end');
  const nframes = await dash.stop();
  console.log('dash frames', nframes);
} catch (e) {
  console.error('RECORDING FAILED:', e.message);
  await shot(page, 'FAILED').catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ marks, checks, net: NET }, null, 1));
  try {
    runner?.kill();
  } catch {}
  await ctx.close().catch(() => {});
  console.log('checks:', checks.map((c) => `${c.scene}:${c.ok ? 'PASS' : 'FAIL'}`).join(' '));
  process.exit(process.exitCode ?? 0);
}
