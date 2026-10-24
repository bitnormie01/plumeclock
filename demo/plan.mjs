// Builds public/plan.json (scene timeline, audio-first) from audio/<id>.words.json.
// Scene length = narration length + 0.5 s lead + 1.0 s tail. cut.mjs cuts each clip to exactly this length.
import fs from 'node:fs';

const LEAD = 0.5;
const TAIL = 1.0;
const FPS = 30;
const ids = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const extra = JSON.parse(fs.readFileSync('sceneextras.json', 'utf8'));
let start = 0;
const scenes = ids.map((id) => {
  const w = JSON.parse(fs.readFileSync(`audio/${id}.words.json`, 'utf8'));
  const seconds = w.duration + LEAD + TAIL;
  const frames = Math.round(seconds * FPS);
  const s = {
    id,
    clip: `clips/${id}.mp4`,
    audio: `audio/${id}.wav`,
    startFrame: start,
    frames,
    seconds: frames / FPS,
    leadSec: LEAD,
    words: w.words,
    ...(extra[id] ?? {}),
  };
  start += frames;
  return s;
});
fs.writeFileSync('public/plan.json', JSON.stringify({ totalFrames: start, scenes }, null, 1));
console.log(scenes.map((s) => `${s.id} ${s.seconds.toFixed(1)}s`).join(' · '), '→ total', (start / FPS).toFixed(1), 's');
