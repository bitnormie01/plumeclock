import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { co2eTonnesPerYear } from '../src/lib/co2e';
import { feedbackLabel } from '../src/lib/feedback';
import { buildTree, hashSourceRecord, verifyProof } from '../src/lib/merkle';
import { referenceDateFromLastModified } from '../src/lib/records';
import type { SnapshotFile } from '../src/lib/types';

const snap = JSON.parse(readFileSync('public/data/snapshot.json', 'utf8')) as SnapshotFile;
const byName = new Map(snap.records.map((r) => [r.sourceName, r]));

describe('committed public/data/snapshot.json (real IMEO data)', () => {
  it('has the v1 schema and a pinned provenance', () => {
    expect(snap.schema).toBe('plumeclock.snapshot.v1');
    expect(snap.provenance.files.map((f) => f.name).sort()).toEqual([
      'unep_methanedata_detected_plumes_csv.zip',
      'unep_methanedata_responserate.zip',
    ]);
    const plumes = snap.provenance.files.find((f) => f.name === 'unep_methanedata_detected_plumes_csv.zip');
    expect(snap.referenceDate).toBe(referenceDateFromLastModified(plumes!.lastModified));
  });

  it('only holds MARS-notified oil and gas sources, each leaf recomputable', () => {
    expect(snap.universeCount).toBe(snap.records.length);
    expect(snap.records.length).toBeGreaterThan(100);
    for (const r of snap.records) {
      expect(r.sector).toBe('Oil and Gas');
      expect(r.notified).toBe('Yes');
      expect(hashSourceRecord(r)).toBe(r.leaf);
      expect(r.co2eTonnesPerYear).toBe(co2eTonnesPerYear(r.rateKgPerHour));
      expect(r.feedbackLabel).toBe(feedbackLabel(r.feedbackOperator, r.feedbackGovernment));
    }
  });

  it('commits all records to the root', () => {
    expect(buildTree(snap.records.map((r) => r.leaf)).root).toBe(snap.root);
  });

  it('has a ticket set with valid proofs that includes both scenario sources', () => {
    expect(snap.ticketSet.length).toBeGreaterThanOrEqual(2);
    expect(snap.ticketSet.length).toBeLessThanOrEqual(42);
    expect(snap.ticketSet).toContain(snap.scenario.operatorA);
    expect(snap.ticketSet).toContain(snap.scenario.operatorB);
    for (const name of snap.ticketSet) {
      const rec = byName.get(name);
      expect(rec, name).toBeDefined();
      expect(verifyProof(rec!.leaf, snap.proofs[name], snap.root)).toBe(true);
      expect(snap.histories[name].length).toBeGreaterThan(0);
    }
  });

  it('picks scenario sources that obey the locked rules', () => {
    const a = byName.get(snap.scenario.operatorA)!;
    expect(a.feedbackOperator).toBe('Yes');
    expect(a.persistency).toBe('absent');
    expect(a.plumeCount).toBeGreaterThanOrEqual(2);
    const b = byName.get(snap.scenario.operatorB)!;
    expect(b.feedbackOperator).toBe('No');
    expect(b.feedbackGovernment).toBe('No');
    expect(b.persistency).toBe('persistent');
  });

  it('carries the country response-rate overlay', () => {
    expect(snap.responseRates.length).toBeGreaterThan(0);
    for (const rr of snap.responseRates) {
      expect(rr.ratePct).toBeGreaterThanOrEqual(0);
      expect(rr.ratePct).toBeLessThanOrEqual(100);
    }
  });
});
