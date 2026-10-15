import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_GENERATOR, isValidNotice, templateNotice } from '../src/lib/notices';
import type { NoticesFile, SnapshotFile } from '../src/lib/types';

const snap = JSON.parse(readFileSync('public/data/snapshot.json', 'utf8')) as SnapshotFile;
const notices = JSON.parse(readFileSync('public/data/notices.json', 'utf8')) as NoticesFile;
const byName = new Map(snap.records.map((r) => [r.sourceName, r]));

describe('committed public/data/notices.json', () => {
  it('has one valid notice per ticket-set source', () => {
    expect(notices.schema).toBe('plumeclock.notices.v1');
    expect(Object.keys(notices.notices).sort()).toEqual([...snap.ticketSet].sort());
    for (const name of snap.ticketSet) {
      expect(isValidNotice(notices.notices[name].text, byName.get(name)!)).toBe(true);
    }
  });

  it('matches the template exactly wherever the template generated it', () => {
    for (const name of snap.ticketSet) {
      const n = notices.notices[name];
      if (n.generator === TEMPLATE_GENERATOR) expect(n.text).toBe(templateNotice(byName.get(name)!));
    }
  });
});
