import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Word = { text: string; start: number; end: number; ws: string };
type Scene = {
  id: string;
  clip: string;
  audio: string;
  startFrame: number;
  frames: number;
  leadSec: number;
  words: Word[];
  zoom?: boolean;
  chip?: { atSec: number; durSec: number; text: string };
  titleCard?: boolean;
  outro?: { fromSec: number };
};

const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';

// Kokoro emits punctuation as its own token; glue it to the previous word.
function mergePunct(words: Word[]): Word[] {
  const out: Word[] = [];
  for (const w of words) {
    if (/^[.,!?:;]+$/.test(w.text) && out.length) {
      const p = out[out.length - 1];
      p.text += w.text;
      p.end = Math.max(p.end, w.end);
      p.ws = w.ws;
    } else {
      out.push({ ...w });
    }
  }
  return out;
}

// Group words into short caption pages (<= 9 words, break after sentence/clause punctuation).
function pages(words: Word[]): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    const endsClause = /[.!?:;]$/.test(w.text) || (/,$/.test(w.text) && cur.length >= 5);
    if (cur.length >= 9 || endsClause) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.filter((p) => p.length);
}

const Captions: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - scene.leadSec;
  if (scene.outro && frame / fps > scene.outro.fromSec + 0.5) return null;
  const pgs = pages(mergePunct(scene.words));
  const page = pgs.find((p, i) => {
    const next = pgs[i + 1];
    const until = next ? next[0].start - 0.02 : p[p.length - 1].end + 0.6;
    return t >= p[0].start - 0.05 && t < until;
  });
  if (!page) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 34, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          background: 'rgba(8,12,22,0.85)',
          borderRadius: 14,
          padding: '12px 28px',
          maxWidth: 1560,
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 42,
          lineHeight: 1.25,
          fontWeight: 600,
        }}
      >
        {page.map((w, i) => {
          const active = t >= w.start && t < w.end + 0.05;
          return (
            <span key={i} style={{ color: active ? '#ffd166' : '#e9eef8' }}>
              {w.text}{' '}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opacity = interpolate(t, [0, 0.4, 2.6, 3.4], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        background: 'rgba(7,10,18,0.92)',
        opacity,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT,
        color: '#fff',
      }}
    >
      <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -2 }}>PlumeClock</div>
      <div style={{ fontSize: 44, marginTop: 14, color: '#c9d3e6' }}>
        an on-chain response clock for methane super-emitters
      </div>
      <div style={{ fontSize: 30, marginTop: 36, color: '#8fa0bf' }}>
        IEEE ClimateChain Global Hackathon · Climate Data &amp; Environmental Monitoring
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ chip: NonNullable<Scene['chip']> }> = ({ chip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opacity = interpolate(
    t,
    [chip.atSec, chip.atSec + 0.3, chip.atSec + chip.durSec - 0.3, chip.atSec + chip.durSec],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return (
    <div
      style={{
        position: 'absolute',
        top: 205,
        left: 740,
        transform: 'translateX(-50%)',
        opacity,
        background: '#ffd166',
        color: '#1a1a1a',
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 38,
        padding: '12px 30px',
        borderRadius: 12,
      }}
    >
      {chip.text}
    </div>
  );
};

const Outro: React.FC<{ fromSec: number }> = ({ fromSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opacity = interpolate(t, [fromSec, fromSec + 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: 'rgba(7,10,18,0.94)',
        fontFamily: FONT,
        color: '#fff',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 90,
      }}
    >
      <div style={{ maxWidth: 1060 }}>
        <div style={{ fontSize: 84, fontWeight: 800 }}>PlumeClock</div>
        <div style={{ fontSize: 38, marginTop: 28, lineHeight: 1.4 }}>
          <b style={{ color: '#7ee0a1' }}>Real:</b> UNEP IMEO detections &amp; statuses
          <br />
          <b style={{ color: '#ffd166' }}>Simulated:</b> operators, bonds, attestations
          <br />
          <b style={{ color: '#9ec5ff' }}>Testnet only:</b> Base Sepolia, no real funds
        </div>
        <div style={{ fontSize: 28, marginTop: 30, color: '#b7c3da', lineHeight: 1.45 }}>
          Track: Climate Data &amp; Environmental Monitoring
          <br />
          Data: UNEP&apos;s International Methane Emissions Observatory, Eye on Methane // GLOBAL (CC BY-NC-SA 4.0)
          <br />
          github.com/bitnormie01/plumeclock
        </div>
      </div>
      <div style={{ background: '#fff', padding: 22, borderRadius: 16 }}>
        <Img src={staticFile('qr.png')} style={{ width: 360, height: 360, display: 'block' }} />
      </div>
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const scale = scene.zoom ? interpolate(frame, [0, scene.frames], [1, 1.07]) : 1;
  return (
    <AbsoluteFill style={{ background: '#05070d' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: '50% 40%' }}>
        <OffthreadVideo src={staticFile(scene.clip)} muted style={{ width: 1920, height: 1080 }} />
      </AbsoluteFill>
      <Sequence from={Math.round(scene.leadSec * 30)}>
        <Audio src={staticFile(scene.audio)} />
      </Sequence>
      {scene.chip ? <Chip chip={scene.chip} /> : null}
      <Captions scene={scene} />
      {scene.titleCard ? <TitleCard /> : null}
      {scene.outro ? <Outro fromSec={scene.outro.fromSec} /> : null}
    </AbsoluteFill>
  );
};

export const PlumeClockVideo: React.FC<{ plan: { scenes: Scene[] } }> = ({ plan }) => (
  <AbsoluteFill style={{ background: '#05070d' }}>
    {plan.scenes.map((s) => (
      <Sequence key={s.id} from={s.startFrame} durationInFrames={s.frames}>
        <SceneView scene={s} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
