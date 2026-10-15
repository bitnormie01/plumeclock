import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LLM_MODEL,
  NOTICE_SYSTEM_PROMPT,
  buildNotices,
  isValidNotice,
  noticePrompt,
  templateNotice,
  type Drafter,
} from '../src/lib/notices';
import type { SnapshotRecord } from '../src/lib/types';

const REC: SnapshotRecord = {
  sourceName: 'KAZ_S_003',
  sourceId: '0x4b415a5f535f3030330000000000000000000000000000000000000000000000',
  lastPlumeId: 'p-kaz-1',
  lastPlumeAt: 1780217349,
  rateKgPerHour: 7847,
  plumeCount: 23,
  latE5: 4534143,
  lonE5: 5519165,
  country: 'Kazakhstan',
  sector: 'Oil and Gas',
  sourceType: 'Transmission Compressor Station',
  persistency: 'persistent',
  notified: 'Yes',
  feedbackOperator: 'No',
  feedbackGovernment: 'No',
  leaf: '0x344386895199e3ec178a6af01c28960407b752ee1970bd3f2d42e658558340c8',
  co2eTonnesPerYear: 2048443,
  feedbackLabel: 'Notified – no response received',
  triage: { score: 83, priority: 'high', impact: 0.828, persistenceWeight: 1, responseFactor: 1 },
};
const REC2: SnapshotRecord = { ...REC, sourceName: 'IRQ_S_067', country: 'Iraq' };

describe('templateNotice', () => {
  it('states only the facts, with the CO2e assumption and the IMEO status', () => {
    expect(templateNotice(REC)).toBe(
      'KAZ_S_003 (Transmission Compressor Station, Kazakhstan): satellites recorded a methane plume of ' +
        '7,847 kg/h on 2026-05-31. If it persisted all year that is about 2,048,443 t CO2e (GWP100 29.8). ' +
        'IMEO status: Notified – no response received. Triage priority: high (83/100).',
    );
    expect(isValidNotice(templateNotice(REC), REC)).toBe(true);
  });
});

describe('prompting', () => {
  it('forbids speculation and passes the facts verbatim', () => {
    expect(NOTICE_SYSTEM_PROMPT).toContain('Do not guess who operates the site');
    expect(noticePrompt(REC)).toContain('Source ID: KAZ_S_003');
    expect(noticePrompt(REC)).toContain('IMEO status: Notified – no response received');
    expect(DEFAULT_LLM_MODEL).toBe('claude-opus-5-5');
  });
});

describe('isValidNotice', () => {
  it('requires the source id and at most 600 characters', () => {
    expect(isValidNotice('A notice about KAZ_S_003.', REC)).toBe(true);
    expect(isValidNotice('A notice without the id.', REC)).toBe(false);
    expect(isValidNotice(`KAZ_S_003 ${'x'.repeat(600)}`, REC)).toBe(false);
    expect(isValidNotice('   ', REC)).toBe(false);
  });
});

describe('buildNotices', () => {
  it('uses templates when no drafter is configured', async () => {
    const file = await buildNotices([REC], '2026-10-16T09:00:00.000Z');
    expect(file).toEqual({
      schema: 'plumeclock.notices.v1',
      generatedAt: '2026-10-16T09:00:00.000Z',
      generator: 'template',
      notices: { KAZ_S_003: { text: templateNotice(REC), generator: 'template' } },
    });
  });

  it('keeps valid LLM text and falls back per record otherwise', async () => {
    const drafter: Drafter = async (rec) =>
      rec.sourceName === 'KAZ_S_003'
        ? { kind: 'text', text: '  KAZ_S_003 keeps emitting; IMEO lists no response.  ' }
        : { kind: 'fallback', reason: 'refusal' };
    const file = await buildNotices([REC, REC2], 't', drafter, 'claude-opus-5-5');
    expect(file.generator).toBe('claude-opus-5-5');
    expect(file.notices.KAZ_S_003).toEqual({
      text: 'KAZ_S_003 keeps emitting; IMEO lists no response.',
      generator: 'claude-opus-5-5',
    });
    expect(file.notices.IRQ_S_067).toEqual({ text: templateNotice(REC2), generator: 'template' });
  });

  it('rejects LLM text that drops the source id', async () => {
    const drafter: Drafter = async () => ({ kind: 'text', text: 'A plume was seen.' });
    const file = await buildNotices([REC], 't', drafter);
    expect(file.notices.KAZ_S_003.generator).toBe('template');
    expect(file.generator).toBe('template');
  });

  it('stops calling the LLM after an abort (e.g. bad key)', async () => {
    let calls = 0;
    const drafter: Drafter = async () => {
      calls++;
      return { kind: 'abort', reason: 'auth: 401' };
    };
    const file = await buildNotices([REC, REC2], 't', drafter);
    expect(calls).toBe(1);
    expect(Object.values(file.notices).every((n) => n.generator === 'template')).toBe(true);
  });
});
