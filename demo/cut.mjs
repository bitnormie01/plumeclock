// Turns the raw JPEG frame streams into constant-30fps clips, then cuts one clip per scene per cutplan.json.
// Usage: node cut.mjs run1 [--full]   (--full re-encodes the full streams even if they exist)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RUN = process.argv[2] ?? 'run1';
const FORCE = process.argv.includes('--full');
const RAW = path.resolve('raw', RUN);
const OUT = path.resolve('public', 'clips');
fs.mkdirSync(OUT, { recursive: true });
const marks = JSON.parse(fs.readFileSync(path.join(RAW, 'marks.json'), 'utf8')).marks;
const M = Object.fromEntries(marks.map((m) => [m.name, m.t]));
const ff = (args) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
};

const streams = {};
for (const seg of ['dash', 'blockscout', 'extra']) {
  const dir = path.join(RAW, seg);
  if (!fs.existsSync(path.join(dir, 'frames.json'))) continue;
  const frames = JSON.parse(fs.readFileSync(path.join(dir, 'frames.json'), 'utf8'));
  const full = path.join(RAW, `${seg}_full.mp4`);
  if (FORCE || !fs.existsSync(full)) {
    const lines = [];
    frames.forEach((f, i) => {
      const dur = i + 1 < frames.length ? (frames[i + 1].t - f.t) / 1000 : 0.5;
      lines.push(`file '${path.join(dir, f.file).replace(/\\/g, '/')}'`, `duration ${Math.max(dur, 0.001).toFixed(3)}`);
    });
    lines.push(`file '${path.join(dir, frames[frames.length - 1].file).replace(/\\/g, '/')}'`);
    const list = path.join(RAW, `${seg}_list.txt`);
    fs.writeFileSync(list, lines.join('\n'));
    ff(['-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', full]);
  }
  streams[seg] = { file: full, t0: frames[0].t };
  console.log(seg, 'full clip ready; first frame at', frames[0].t, 'ms');
}

// cutplan.json: { S1: { target: sec, pieces: [{ s: 'dash', from: 'S1_start'|number(ms), to: 'S1_end'|number, dFrom: secOffset, dTo: secOffset }] } }
const plan = JSON.parse(fs.readFileSync('cutplan.json', 'utf8'));
const dur = (id) => JSON.parse(fs.readFileSync(`audio/${id}.words.json`, 'utf8')).duration + 1.5;
const at = (v) => (typeof v === 'number' ? v : M[v]);
for (const [sid, sc] of Object.entries(plan)) {
  sc.target = dur(sid);
  const inputs = [];
  const used = new Map();
  const span = (p) =>
    p.rel
      ? [p.from, p.to]
      : [(at(p.from) - streams[p.s].t0) / 1000 + (p.dFrom ?? 0), (at(p.to) - streams[p.s].t0) / 1000 + (p.dTo ?? 0)];
  const parts = sc.pieces.map((p, i) => {
    if (!used.has(p.s)) {
      used.set(p.s, inputs.length);
      inputs.push(streams[p.s].file);
    }
    const [a, b] = span(p);
    return `[${used.get(p.s)}:v]trim=${a.toFixed(3)}:${b.toFixed(3)},setpts=PTS-STARTPTS,fps=30[v${i}]`;
  });
  const n = sc.pieces.length;
  const concat = `${sc.pieces.map((_, i) => `[v${i}]`).join('')}concat=n=${n}:v=1:a=0[c]`;
  const total = sc.pieces.reduce((acc, p) => acc + (span(p)[1] - span(p)[0]), 0);
  const pad = Math.max(0, sc.target - total);
  const filter = `${parts.join(';')};${concat};[c]tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)},trim=0:${sc.target.toFixed(3)},setpts=PTS-STARTPTS,fps=30[o]`;
  ff([...inputs.flatMap((f) => ['-i', f]), '-filter_complex', filter, '-map', '[o]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', path.join(OUT, `${sid}.mp4`)]);
  console.log(sid, 'raw', total.toFixed(1), 's -> target', sc.target.toFixed(1), 's (freeze pad', pad.toFixed(1), 's)');
}
